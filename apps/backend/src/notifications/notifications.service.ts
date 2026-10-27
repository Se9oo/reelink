import { Inject, Injectable } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { notificationChannels, users } from '../db/schema.js';

import { exchangeKakaoCode, fetchKakaoUserId } from './kakao-api.js';

@Injectable()
export class NotificationsService {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

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
