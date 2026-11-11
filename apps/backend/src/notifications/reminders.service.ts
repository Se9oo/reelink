import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { and, type AnyColumn, asc, eq, exists, gt, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { links, notificationChannels, pushSubscriptions, users } from '../db/schema.js';
import { linkGoUrl } from '../links/link-go-url.js';

import { buildLinkAlarmMessage, buildReminderMessage } from './build-reminder-message.js';
import { KakaoApiError, refreshKakaoToken, sendKakaoMemo } from './kakao-api.js';
import { isWebPushConfigured, sendWebPush, type WebPushPayload } from './web-push-api.js';

const TOKEN_REFRESH_MARGIN_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_RENEW_BEFORE_MS = 14 * 24 * 60 * 60 * 1000;
const REMIND_EVERY_DAYS = 3;
const LINK_ALARM_GIVE_UP_MS = 60 * 60 * 1000;
const DAILY_PUSH_TTL_SECONDS = 12 * 60 * 60;
const KAKAO_SCOPE_NOT_AGREED = '-402';

const CONCURRENCY = 10;

type Channel = typeof notificationChannels.$inferSelect;
type Subscription = typeof pushSubscriptions.$inferSelect;

/**
 * notification_channels를 left join할 때 쓰는 조건. 그 사용자의 active 카카오 채널만 붙는다.
 * @param userId AnyColumn
 */
function activeKakaoChannelOf(userId: AnyColumn) {
	return and(
		eq(notificationChannels.userId, userId),
		eq(notificationChannels.provider, 'kakao'),
		eq(notificationChannels.status, 'active'),
	);
}

/**
 * 카카오 알림이 켜져 있고(notification_method = kakao) active 채널이 붙었는지 보는 조건. activeKakaoChannelOf로 left join한 쿼리에서 쓴다.
 */
function kakaoNotificationOn() {
	return and(eq(users.notificationMethod, 'kakao'), isNotNull(notificationChannels.id));
}

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
export class RemindersService implements OnModuleInit {
	private readonly logger = new Logger(RemindersService.name);
	private linkAlarmsRunning = false;

	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	/**
	 * VAPID 키가 없으면 웹 푸시가 조용히 꺼진 채로 돌기 때문에, 부팅할 때 한 번 오류 로그를 남긴다.
	 */
	onModuleInit() {
		if (!isWebPushConfigured()) {
			this.logger.error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY is not set — web push is disabled');
		}
	}

	/**
	 * 매분 링크별 알림을 보낸다. 이전 실행이 아직 안 끝났으면(카카오 응답이 느릴 때) 건너뛰어 같은 알림이 두 번 가지 않게 한다.
	 */
	@Cron('* * * * *')
	async handleLinkAlarms() {
		if (this.linkAlarmsRunning) {
			return;
		}

		this.linkAlarmsRunning = true;
		try {
			await this.sendLinkAlarms(new Date());
		} finally {
			this.linkAlarmsRunning = false;
		}
	}

	/**
	 * remind_at이 지난 링크를 켜진 채널 전부(카카오, 웹 푸시)로 보내고 remind_at을 비운다. 열람 여부와 3일 간격 제한은 보지 않는다.
	 * 일시적 실패는 remind_at을 남겨 다음 분에 다시 시도하고, 지정 시각에서 1시간이 지난 알림은 보내지 않고 비운다.
	 * 같은 사용자의 링크는 차례로 보내 토큰 갱신이 동시에 일어나지 않게 한다.
	 * @param now Date
	 */
	async sendLinkAlarms(now: Date) {
		const giveUpBefore = new Date(now.getTime() - LINK_ALARM_GIVE_UP_MS);
		const due = await this.db
			.select({
				id: links.id,
				userId: links.userId,
				url: links.url,
				title: links.title,
				savedReason: links.savedReason,
				remindAt: links.remindAt,
				notificationMethod: users.notificationMethod,
				channel: notificationChannels,
			})
			.from(links)
			.innerJoin(users, eq(users.id, links.userId))
			.leftJoin(notificationChannels, activeKakaoChannelOf(users.id))
			.where(
				and(
					lte(links.remindAt, now),
					gt(links.remindAt, giveUpBefore),
					isNull(links.deletedAt),
					or(kakaoNotificationOn(), this.hasPushSubscription()),
				),
			)
			.orderBy(asc(links.remindAt));

		const byUser = new Map<string, typeof due>();
		for (const link of due) {
			const userLinks = byUser.get(link.userId);
			if (userLinks) {
				userLinks.push(link);
			} else {
				byUser.set(link.userId, [link]);
			}
		}

		await forEachInBatches([...byUser.values()], CONCURRENCY, async (userLinks) => {
			const { userId, notificationMethod, channel } = userLinks[0];
			const kakaoChannel = notificationMethod === 'kakao' ? channel : null;

			try {
				const subscriptions = await this.db
					.select()
					.from(pushSubscriptions)
					.where(eq(pushSubscriptions.userId, userId));

				for (const link of userLinks) {
					try {
						await this.sendLinkAlarm(userId, link, kakaoChannel, subscriptions, now);
					} catch (err) {
						this.logger.error(`Link alarm failed for link ${link.id}: ${(err as Error).message}`);
					}
				}
			} catch (err) {
				this.logger.error(`Link alarms failed for user ${userId}: ${(err as Error).message}`);
			}
		});

		await this.db.update(links).set({ remindAt: null }).where(lte(links.remindAt, giveUpBefore));
	}

	/**
	 * 링크 하나의 알림을 보내고, 한 채널이라도 보냈거나 일시적 실패 없이 끝났으면(연동이 끊겨 보낼 곳이 없는 경우) remind_at을 비운다.
	 * 보내는 사이 사용자가 시각을 바꿨으면 새 시각은 남겨둔다.
	 * @param userId string
	 * @param link { id, url, title, savedReason, remindAt }
	 * @param kakaoChannel Channel | null 카카오 알림이 켜져 있을 때만
	 * @param subscriptions Subscription[] 사용자의 웹 푸시 구독. 만료된 구독은 notify가 빼므로 같은 사용자의 다음 링크에 그대로 넘긴다
	 * @param now Date
	 */
	private async sendLinkAlarm(
		userId: string,
		link: { id: string; url: string; title: string | null; savedReason: string | null; remindAt: Date | null },
		kakaoChannel: Channel | null,
		subscriptions: Subscription[],
		now: Date,
	) {
		const base = process.env.FRONTEND_URL ?? 'http://localhost:3000';
		const goUrl = linkGoUrl(link.id);
		const title = link.title || new URL(link.url).hostname;

		const { sent, failed } = await this.notify(userId, now, {
			kakaoChannel,
			subscriptions,
			kakao: {
				message: buildLinkAlarmMessage(title, link.savedReason),
				buttons: [
					{ title: '링크 바로가기', url: goUrl },
					{ title: 'Reelink에서 보기', url: `${base}/feed` },
				],
			},
			push: {
				payload: {
					title: `⏰ ${title}`,
					body: link.savedReason ?? '지정한 알림 시간이에요',
					url: goUrl,
					tag: `link-${link.id}`,
				},
				options: { ttlSeconds: LINK_ALARM_GIVE_UP_MS / 1000, urgency: 'high' },
			},
		});

		if (sent || !failed) {
			await this.db
				.update(links)
				.set({ remindAt: null })
				.where(and(eq(links.id, link.id), eq(links.remindAt, link.remindAt!)));
		}
	}

	/**
	 * 켜진 채널 전부로 보낸다. 카카오는 kakaoChannel이 active일 때만(앞선 발송에서 revoke됐으면 건너뜀), 웹 푸시는 VAPID 키가 설정돼 있을 때
	 * 구독 전부로 동시에 보내고, 만료된 구독(404/410)은 DB와 subscriptions 배열에서 뺀다. 한 채널이 실패해도 나머지 채널은 계속 보낸다.
	 * @param userId string
	 * @param now Date
	 * @param message { kakaoChannel, subscriptions, kakao: { message, buttons? }, push: { payload, options } }
	 * @returns { sent: boolean; failed: boolean } sent는 한 채널이라도 보냈는지, failed는 일시적 실패(다시 시도할 만한)가 있었는지
	 */
	private async notify(
		userId: string,
		now: Date,
		{
			kakaoChannel,
			subscriptions,
			kakao,
			push,
		}: {
			kakaoChannel: Channel | null;
			subscriptions: Subscription[];
			kakao: { message: string; buttons?: { title: string; url: string }[] };
			push: { payload: WebPushPayload; options: Parameters<typeof sendWebPush>[2] };
		},
	): Promise<{ sent: boolean; failed: boolean }> {
		let sent = false;
		let failed = false;

		if (kakaoChannel?.status === 'active') {
			try {
				sent = await this.sendKakao(kakaoChannel, kakao.message, now, kakao.buttons);
			} catch (err) {
				failed = true;
				this.logger.error(`Kakao send failed for user ${userId}: ${(err as Error).message}`);
			}
		}

		if (!isWebPushConfigured()) {
			return { sent, failed };
		}

		const results = await Promise.all(
			subscriptions.map(async (subscription) => {
				try {
					return (await sendWebPush(subscription, push.payload, push.options)) ? 'sent' : 'gone';
				} catch (err) {
					this.logger.error(`Web push failed for user ${userId}: ${(err as Error).message}`);
					return 'failed';
				}
			}),
		);
		const gone = subscriptions.filter((_, i) => results[i] === 'gone');

		if (gone.length > 0) {
			await this.db.delete(pushSubscriptions).where(
				inArray(
					pushSubscriptions.id,
					gone.map((subscription) => subscription.id),
				),
			);
			subscriptions.splice(0, subscriptions.length, ...subscriptions.filter((s) => !gone.includes(s)));
		}

		return { sent: sent || results.includes('sent'), failed: failed || results.includes('failed') };
	}

	/**
	 * 사용자에게 웹 푸시 구독이 하나라도 있는지 보는 조건. users 테이블이 쿼리에 있어야 한다.
	 */
	private hasPushSubscription() {
		return exists(
			this.db
				.select({ id: pushSubscriptions.id })
				.from(pushSubscriptions)
				.where(eq(pushSubscriptions.userId, users.id)),
		);
	}

	/**
	 * 매일 KST 09:00에 리마인드를 보낸 뒤, 보낼 게 없던 사용자까지 포함해 만료가 가까운 refresh token을 연장한다.
	 */
	@Cron('0 9 * * *', { timeZone: 'Asia/Seoul' })
	async handleDailyReminders() {
		const now = new Date();
		await this.sendDailyReminders(now);
		await this.refreshExpiringTokens(now);
	}

	/**
	 * 알림 on/off와 상관없이, refresh token 만료가 2주 안으로 다가온(또는 만료 시각을 아직 모르는) active 카카오 채널만 갱신해
	 * refresh token을 연장한다. 카카오는 남은 기간이 1개월 미만일 때 갱신하면 새 refresh token을 주므로, 한 번 연장하면 약 6주 동안 대상에서 빠진다.
	 * 한 채널이 실패해도 나머지는 계속 처리한다.
	 * @param now Date
	 */
	async refreshExpiringTokens(now: Date) {
		const channels = await this.db
			.select()
			.from(notificationChannels)
			.where(
				and(
					eq(notificationChannels.provider, 'kakao'),
					eq(notificationChannels.status, 'active'),
					or(
						isNull(notificationChannels.refreshTokenExpiresAt),
						lte(notificationChannels.refreshTokenExpiresAt, new Date(now.getTime() + REFRESH_TOKEN_RENEW_BEFORE_MS)),
					),
				),
			);

		await forEachInBatches(channels, CONCURRENCY, async (channel) => {
			try {
				await this.getValidAccessToken(channel, now, { force: true });
			} catch (err) {
				this.logger.error(`Token refresh failed for user ${channel.userId}: ${(err as Error).message}`);
			}
		});
	}

	/**
	 * 켜진 알림 채널(카카오 알림 on + 채널 active, 또는 웹 푸시 구독)이 있고, 등록 후 reminder_interval_days가 지난 안 본 링크가 있고,
	 * 마지막 알림 후 KST 날짜 기준 3일이 지난 사용자에게 한 통씩 보낸다. 한 사용자가 실패해도 나머지는 계속 처리한다.
	 * @param now Date
	 */
	async sendDailyReminders(now: Date) {
		const nowParam = sql`${now.toISOString()}::timestamptz`;
		const targets = await this.db
			.select({ userId: users.id, notificationMethod: users.notificationMethod, channel: notificationChannels })
			.from(users)
			.leftJoin(notificationChannels, activeKakaoChannelOf(users.id))
			.where(
				and(
					or(kakaoNotificationOn(), this.hasPushSubscription()),
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

		await forEachInBatches(targets, CONCURRENCY, async ({ userId, notificationMethod, channel }) => {
			try {
				await this.remindUser(userId, notificationMethod === 'kakao' ? channel : null, now);
			} catch (err) {
				this.logger.error(`Reminder failed for user ${userId}: ${(err as Error).message}`);
			}
		});
	}

	/**
	 * 사용자의 안 본 링크 전체를 오래된 순으로 담아 켜진 채널 전부로 보내고, 한 채널이라도 성공했을 때만 users.last_reminded_at을 채운다.
	 * @param userId string
	 * @param kakaoChannel Channel | null 카카오 알림이 켜져 있을 때만
	 * @param now Date
	 */
	private async remindUser(userId: string, kakaoChannel: Channel | null, now: Date) {
		const unviewed = await this.db
			.select({ title: links.title, url: links.url })
			.from(links)
			.where(and(eq(links.userId, userId), eq(links.status, 'unviewed'), isNull(links.deletedAt)))
			.orderBy(asc(links.createdAt));

		const message = buildReminderMessage(unviewed.map((link) => link.title || new URL(link.url).hostname));
		const feedUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/feed`;
		const subscriptions = await this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
		const { sent } = await this.notify(userId, now, {
			kakaoChannel,
			subscriptions,
			kakao: { message },
			push: {
				payload: { title: 'Reelink', body: message, url: feedUrl, tag: 'daily' },
				options: { ttlSeconds: DAILY_PUSH_TTL_SECONDS, urgency: 'normal' },
			},
		});

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
	 * @param buttons { title: string; url: string }[] 주면 기본 "리마인드 보기" 버튼 대신 단다
	 * @returns boolean 보냈으면 true, 연동이 끊겨 보내지 못했으면 false
	 * @throws KakaoApiError 5xx·권한 철회가 아닌 403 등 일시적이거나 사용자 탓이 아닌 실패
	 */
	private async sendKakao(
		channel: Channel,
		message: string,
		now: Date,
		buttons?: { title: string; url: string }[],
	): Promise<boolean> {
		const feedUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/feed`;
		const send = (token: string) =>
			buttons ? sendKakaoMemo(token, message, feedUrl, buttons) : sendKakaoMemo(token, message, feedUrl);
		const accessToken = await this.getValidAccessToken(channel, now);

		if (!accessToken) {
			return false;
		}

		try {
			await send(accessToken);
			return true;
		} catch (err) {
			if (err instanceof KakaoApiError && err.status === 403 && err.error === KAKAO_SCOPE_NOT_AGREED) {
				await this.revoke(channel);
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

		await send(refreshedToken);
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
			await this.revoke(channel);
			return null;
		}

		try {
			const tokens = await refreshKakaoToken(channel.refreshToken);
			const refreshed = {
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken ?? channel.refreshToken,
				tokenExpiresAt: new Date(now.getTime() + tokens.expiresIn * 1000),
				refreshTokenExpiresAt: tokens.refreshTokenExpiresIn
					? new Date(now.getTime() + tokens.refreshTokenExpiresIn * 1000)
					: channel.refreshTokenExpiresAt,
			};
			await this.db.update(notificationChannels).set(refreshed).where(eq(notificationChannels.id, channel.id));
			Object.assign(channel, refreshed);

			return tokens.accessToken;
		} catch (err) {
			if (err instanceof KakaoApiError && err.error === 'invalid_grant') {
				await this.revoke(channel);
				return null;
			}
			throw err;
		}
	}

	/**
	 * 알림 채널을 revoked로 바꿔 이후 발송·갱신 대상에서 뺀다. channel 객체도 바꿔 같은 실행 안의 다음 발송도 건너뛰게 한다.
	 * @param channel Channel
	 */
	private async revoke(channel: Channel) {
		await this.db
			.update(notificationChannels)
			.set({ status: 'revoked' })
			.where(eq(notificationChannels.id, channel.id));
		channel.status = 'revoked';
	}
}
