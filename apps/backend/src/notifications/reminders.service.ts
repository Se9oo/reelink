import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { and, asc, eq, exists, isNull, or, sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { links, notificationChannels, users } from '../db/schema.js';

import { buildReminderMessage } from './build-reminder-message.js';
import { KakaoApiError, refreshKakaoToken, sendKakaoMemo } from './kakao-api.js';

const TOKEN_REFRESH_MARGIN_MS = 10 * 60 * 1000;
const REMIND_EVERY_DAYS = 3;
const KAKAO_SCOPE_NOT_AGREED = '-402';

const CONCURRENCY = 10;

type Channel = typeof notificationChannels.$inferSelect;

/**
 * items를 size개씩 묶어, 묶음 안에서는 동시에, 묶음끼리는 차례로 fn을 실행한다.
 * @param items T[]
 * @param size number 동시에 실행할 개수
 * @param fn (item: T) => Promise<void> 실패를 직접 처리해야 한다(던지면 같은 묶음의 결과를 기다리지 않고 멈춤)
 */
async function forEachInBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
	// ponytail: 묶음 단위라 가장 느린 요청 하나가 묶음 전체를 기다리게 함, 사용자가 많아져 이게 병목이면 풀(pool) 방식이나 BullMQ로
	for (let i = 0; i < items.length; i += size) {
		await Promise.all(items.slice(i, i + size).map(fn));
	}
}

@Injectable()
export class RemindersService {
	private readonly logger = new Logger(RemindersService.name);

	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	/**
	 * 매일 KST 09:00에 리마인드를 보낸 뒤, 보낼 게 없던 사용자까지 포함해 만료가 가까운 카카오 토큰을 갱신한다.
	 */
	@Cron('0 9 * * *', { timeZone: 'Asia/Seoul' })
	async handleDailyReminders() {
		const now = new Date();
		await this.sendDailyReminders(now);
		await this.refreshExpiringTokens(now);
	}

	/**
	 * 알림 on/off와 상관없이 active 카카오 채널 전부의 토큰을 만료가 가까우면 갱신해, refresh token이 2개월 뒤 만료되지 않게 한다.
	 * 한 채널이 실패해도 나머지는 계속 처리한다.
	 * @param now Date
	 */
	async refreshExpiringTokens(now: Date) {
		const channels = await this.db
			.select()
			.from(notificationChannels)
			.where(and(eq(notificationChannels.provider, 'kakao'), eq(notificationChannels.status, 'active')));

		await forEachInBatches(channels, CONCURRENCY, async (channel) => {
			try {
				await this.getValidAccessToken(channel, now);
			} catch (err) {
				this.logger.error(`Token refresh failed for user ${channel.userId}: ${(err as Error).message}`);
			}
		});
	}

	/**
	 * 알림이 켜져 있고(kakao, 채널 active), 등록 후 reminder_interval_days가 지난 안 본 링크가 있고,
	 * 마지막 알림 후 KST 날짜 기준 3일이 지난 사용자에게 한 통씩 보낸다. 한 사용자가 실패해도 나머지는 계속 처리한다.
	 * @param now Date
	 */
	async sendDailyReminders(now: Date) {
		const nowParam = sql`${now.toISOString()}::timestamptz`;
		const targets = await this.db
			.select({ userId: users.id, channel: notificationChannels })
			.from(users)
			.innerJoin(
				notificationChannels,
				and(eq(notificationChannels.userId, users.id), eq(notificationChannels.provider, 'kakao')),
			)
			.where(
				and(
					eq(users.notificationMethod, 'kakao'),
					eq(notificationChannels.status, 'active'),
					or(
						isNull(users.lastRemindedAt),
						sql`(${users.lastRemindedAt} at time zone 'Asia/Seoul')::date <= (${nowParam} at time zone 'Asia/Seoul')::date - ${REMIND_EVERY_DAYS}::int`,
					),
					exists(
						this.db
							.select({ id: links.id })
							.from(links)
							.where(
								and(
									eq(links.userId, users.id),
									eq(links.status, 'unviewed'),
									isNull(links.deletedAt),
									sql`${links.createdAt} <= ${nowParam} - make_interval(days => ${users.reminderIntervalDays})`,
								),
							),
					),
				),
			);

		await forEachInBatches(targets, CONCURRENCY, async ({ userId, channel }) => {
			try {
				await this.remindUser(userId, channel, now);
			} catch (err) {
				this.logger.error(`Reminder failed for user ${userId}: ${(err as Error).message}`);
			}
		});
	}

	/**
	 * 사용자의 안 본 링크 전체를 오래된 순으로 담아 보내고, 발송에 성공했을 때만 users.last_reminded_at을 채운다.
	 * @param userId string
	 * @param channel Channel
	 * @param now Date
	 */
	private async remindUser(userId: string, channel: Channel, now: Date) {
		const unviewed = await this.db
			.select({ title: links.title, url: links.url })
			.from(links)
			.where(and(eq(links.userId, userId), eq(links.status, 'unviewed'), isNull(links.deletedAt)))
			.orderBy(asc(links.createdAt));

		const message = buildReminderMessage(unviewed.map((link) => link.title || new URL(link.url).hostname));
		const sent = await this.sendKakao(channel, message, now);

		if (sent) {
			await this.db.update(users).set({ lastRemindedAt: now }).where(eq(users.id, userId));
		}
	}

	/**
	 * 카카오 '나에게 보내기'로 메시지를 보낸다. 401이면 토큰을 강제로 갱신해 한 번 더 보내고,
	 * 403(-402, 메시지 권한 철회)이면 채널을 revoked로 바꾼다.
	 * @param channel Channel
	 * @param message string
	 * @param now Date
	 * @returns boolean 보냈으면 true, 연동이 끊겨 보내지 못했으면 false
	 * @throws KakaoApiError 5xx·권한 철회가 아닌 403 등 일시적이거나 사용자 탓이 아닌 실패
	 */
	private async sendKakao(channel: Channel, message: string, now: Date): Promise<boolean> {
		const feedUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/feed`;
		const accessToken = await this.getValidAccessToken(channel, now);

		if (!accessToken) {
			return false;
		}

		try {
			await sendKakaoMemo(accessToken, message, feedUrl);
			return true;
		} catch (err) {
			if (err instanceof KakaoApiError && err.status === 403 && err.error === KAKAO_SCOPE_NOT_AGREED) {
				await this.revoke(channel.id);
				return false;
			}
			if (!(err instanceof KakaoApiError) || err.status !== 401) {
				throw err;
			}
		}

		const refreshedToken = await this.getValidAccessToken(channel, now, { force: true });

		if (!refreshedToken) {
			return false;
		}

		await sendKakaoMemo(refreshedToken, message, feedUrl);
		return true;
	}

	/**
	 * 쓸 수 있는 access token을 반환한다. 만료까지 10분이 안 남았거나 force면 refresh token으로 갱신해 저장하고 channel 객체도 바꾼다.
	 * @param channel Channel
	 * @param now Date
	 * @param force boolean 만료 시각과 상관없이 갱신
	 * @returns string | null 갱신이 invalid_grant(refresh token 무효)로 거부되면 채널을 revoked로 바꾸고 null
	 * @throws KakaoApiError invalid_client 같은 서버 설정 오류나 5xx — revoke하지 않는다
	 */
	private async getValidAccessToken(channel: Channel, now: Date, { force = false } = {}): Promise<string | null> {
		const expiresAt = channel.tokenExpiresAt?.getTime() ?? 0;

		if (!force && channel.accessToken && expiresAt - now.getTime() > TOKEN_REFRESH_MARGIN_MS) {
			return channel.accessToken;
		}

		if (!channel.refreshToken) {
			await this.revoke(channel.id);
			return null;
		}

		try {
			const tokens = await refreshKakaoToken(channel.refreshToken);
			const refreshed = {
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken ?? channel.refreshToken,
				tokenExpiresAt: new Date(now.getTime() + tokens.expiresIn * 1000),
			};
			await this.db.update(notificationChannels).set(refreshed).where(eq(notificationChannels.id, channel.id));
			Object.assign(channel, refreshed);

			return tokens.accessToken;
		} catch (err) {
			if (err instanceof KakaoApiError && err.error === 'invalid_grant') {
				await this.revoke(channel.id);
				return null;
			}
			throw err;
		}
	}

	/**
	 * 알림 채널을 revoked로 바꿔 이후 발송·갱신 대상에서 뺀다.
	 * @param channelId string
	 */
	private async revoke(channelId: string) {
		await this.db.update(notificationChannels).set({ status: 'revoked' }).where(eq(notificationChannels.id, channelId));
	}
}
