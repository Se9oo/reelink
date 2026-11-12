import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { notificationChannels, pushSubscriptions, users } from '../db/schema.js';

import { exchangeKakaoCode, fetchKakaoUserId } from './kakao-api.js';

@Injectable()
export class NotificationsService {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	/**
	 * 사용자의 알림 방법, 카카오 알림 연동 상태, 웹 푸시 구독 수를 반환한다.
	 * @param userId string
	 * @returns { notificationMethod: string; kakaoStatus: string | null; pushSubscriptionCount: number } 카카오를 연동한 적이 없으면 kakaoStatus는 null, 구독 수는 모든 기기 합
	 */
	async getSettings(userId: string) {
		const [user] = await this.db
			.select({ notificationMethod: users.notificationMethod })
			.from(users)
			.where(eq(users.id, userId));
		const [kakaoChannel] = await this.db
			.select({ status: notificationChannels.status })
			.from(notificationChannels)
			.where(and(eq(notificationChannels.userId, userId), eq(notificationChannels.provider, 'kakao')));
		const pushSubscriptionCount = await this.db.$count(pushSubscriptions, eq(pushSubscriptions.userId, userId));

		return {
			notificationMethod: user.notificationMethod,
			kakaoStatus: kakaoChannel?.status ?? null,
			pushSubscriptionCount,
		};
	}

	/**
	 * 알림 방법을 바꾼다. manual은 알림 끔, kakao는 카카오톡 알림 켬이다.
	 * @param userId string
	 * @param notificationMethod unknown 'manual' | 'kakao'만 허용
	 * @returns { notificationMethod: string; kakaoStatus: string | null; pushSubscriptionCount: number } 바뀐 설정
	 * @throws BadRequestException 지원하지 않는 값이거나, kakao로 바꾸는데 카카오 채널이 active가 아닌 경우
	 */
	async updateNotificationMethod(userId: string, notificationMethod: unknown) {
		if (notificationMethod !== 'manual' && notificationMethod !== 'kakao') {
			throw new BadRequestException('Unsupported notification method');
		}

		if (notificationMethod === 'kakao') {
			const { kakaoStatus } = await this.getSettings(userId);
			if (kakaoStatus !== 'active') {
				throw new BadRequestException('Kakao channel is not connected');
			}
		}

		await this.db.update(users).set({ notificationMethod }).where(eq(users.id, userId));

		return await this.getSettings(userId);
	}

	/**
	 * 카카오 인가 코드를 토큰으로 바꿔 카카오 알림 채널을 저장(이미 있으면 갱신해 active로)하고 알림 방법을 kakao로 바꾼다.
	 * @param userId string
	 * @param code string 카카오 OAuth 콜백으로 받은 인가 코드
	 * @returns boolean 연동했으면 true, 사용자가 메시지 전송 권한(talk_message)을 빼고 동의했으면 저장하지 않고 false
	 */
	async connectKakao(userId: string, code: string): Promise<boolean> {
		const tokens = await exchangeKakaoCode(code);

		if (!tokens.scope.split(' ').includes('talk_message')) {
			return false;
		}

		const externalId = await fetchKakaoUserId(tokens.accessToken);
		const channel = {
			externalId,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
			refreshTokenExpiresAt: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000),
			status: 'active',
		};

		await this.db.transaction(async (tx) => {
			await tx
				.insert(notificationChannels)
				.values({ userId, provider: 'kakao', ...channel })
				.onConflictDoUpdate({ target: [notificationChannels.userId, notificationChannels.provider], set: channel });
			await tx.update(users).set({ notificationMethod: 'kakao' }).where(eq(users.id, userId));
		});

		return true;
	}

	/**
	 * 이 브라우저의 웹 푸시 구독을 저장한다. endpoint가 이미 있으면(같은 브라우저에서 다른 계정이 구독했던 경우 포함) 이 사용자 것으로 덮어쓴다.
	 * @param userId string
	 * @param subscription unknown 브라우저 PushSubscription.toJSON() 모양 { endpoint, keys: { p256dh, auth } }
	 * @throws BadRequestException 모양이 틀렸거나, endpoint가 알려진 푸시 서비스 주소가 아닌 경우(서버가 임의 주소로 요청을 보내지 않게)
	 */
	async savePushSubscription(userId: string, subscription: unknown) {
		const { endpoint, keys } = (subscription ?? {}) as {
			endpoint?: unknown;
			keys?: { p256dh?: unknown; auth?: unknown };
		};

		if (typeof endpoint !== 'string' || !isPushServiceEndpoint(endpoint)) {
			throw new BadRequestException('Unsupported push endpoint');
		}
		if (typeof keys?.p256dh !== 'string' || !keys.p256dh || typeof keys.auth !== 'string' || !keys.auth) {
			throw new BadRequestException('Invalid push subscription keys');
		}

		const values = { userId, p256dhKey: keys.p256dh, authKey: keys.auth };

		await this.db
			.insert(pushSubscriptions)
			.values({ endpoint, ...values })
			.onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
	}

	/**
	 * 이 브라우저의 웹 푸시 구독을 지운다. 내 구독이 아니면 아무것도 하지 않는다.
	 * @param userId string
	 * @param endpoint unknown
	 * @throws BadRequestException endpoint가 문자열이 아닌 경우
	 */
	async deletePushSubscription(userId: string, endpoint: unknown) {
		if (typeof endpoint !== 'string') {
			throw new BadRequestException('endpoint is required');
		}

		await this.db
			.delete(pushSubscriptions)
			.where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));
	}
}

const PUSH_SERVICE_HOSTS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];

/**
 * 크롬(FCM), 파이어폭스, 사파리(애플), 엣지(WNS) 푸시 서비스의 https 주소인지 확인한다.
 * @param endpoint string
 * @returns boolean
 */
function isPushServiceEndpoint(endpoint: string): boolean {
	try {
		const { protocol, hostname } = new URL(endpoint);
		return (
			protocol === 'https:' && PUSH_SERVICE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
		);
	} catch {
		return false;
	}
}
