import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { notificationChannels, users } from '../db/schema.js';

import { exchangeKakaoCode, fetchKakaoUserId } from './kakao-api.js';

@Injectable()
export class NotificationsService {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	/**
	 * 사용자의 알림 방법과 카카오 알림 연동 상태를 반환한다.
	 * @param userId string
	 * @returns { notificationMethod: string; kakaoStatus: string | null } 카카오를 연동한 적이 없으면 kakaoStatus는 null
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

		return {
			notificationMethod: user.notificationMethod,
			kakaoStatus: kakaoChannel?.status ?? null,
		};
	}

	/**
	 * 알림 방법을 바꾼다. manual은 알림 끔, kakao는 카카오톡 알림 켬이다.
	 * @param userId string
	 * @param notificationMethod unknown 'manual' | 'kakao'만 허용
	 * @returns { notificationMethod: string; kakaoStatus: string | null } 바뀐 설정
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
}
