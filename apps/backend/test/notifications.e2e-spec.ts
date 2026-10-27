import { INestApplication } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';
import request from 'supertest';

import { DrizzleDb } from '../src/db/drizzle.module.js';
import { notificationChannels, users } from '../src/db/schema.js';
import { exchangeKakaoCode } from '../src/notifications/kakao-api.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

vi.mock('../src/notifications/kakao-api.js', () => ({
	exchangeKakaoCode: vi.fn(async () => ({
		accessToken: 'kakao-access',
		refreshToken: 'kakao-refresh',
		expiresIn: 21599,
		refreshTokenExpiresIn: 5183999,
		scope: 'talk_message profile_nickname',
	})),
	fetchKakaoUserId: vi.fn(async () => '12345'),
}));

describe('NotificationsController (e2e)', () => {
	let context: E2ETestContext;
	let app: INestApplication;
	let db: DrizzleDb;
	let accessToken: string;
	let testUserId: string;

	beforeAll(async () => {
		context = await setupE2EApp('notifications-e2e@test.com', '알림테스트');
		({ app, db, accessToken, testUserId } = context);
	});

	afterAll(async () => {
		await teardownE2EApp(context);
	});

	async function startConnect() {
		const res = await request(app.getHttpServer())
			.get('/notifications/kakao/connect')
			.set('Cookie', `access_token=${accessToken}`)
			.expect(200);
		const state = new URL(res.body.url).searchParams.get('state');
		const stateCookie = (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

		return { state, stateCookie, url: res.body.url as string };
	}

	test('연동 시작 시 talk_message 권한을 요청하는 카카오 동의 URL을 반환한다.', async () => {
		const { url } = await startConnect();

		expect(new URL(url).searchParams.get('scope')).toBe('talk_message');
	});

	test('state가 쿠키와 다르면 400을 반환한다.', async () => {
		const { stateCookie } = await startConnect();

		await request(app.getHttpServer())
			.get('/notifications/kakao/callback?code=abc&state=wrong')
			.set('Cookie', stateCookie)
			.expect(400);
	});

	test('사용자가 동의를 취소하면 연동하지 않고 cancelled로 리다이렉트한다.', async () => {
		const { state, stateCookie } = await startConnect();

		const res = await request(app.getHttpServer())
			.get(`/notifications/kakao/callback?error=access_denied&state=${state}`)
			.set('Cookie', stateCookie)
			.expect(302);

		expect(res.headers.location).toContain('/settings?kakao=cancelled');
	});

	test('메시지 권한을 빼고 동의하면 연동하지 않는다.', async () => {
		vi.mocked(exchangeKakaoCode).mockResolvedValueOnce({
			accessToken: 'a',
			refreshToken: 'r',
			expiresIn: 21599,
			refreshTokenExpiresIn: 5183999,
			scope: 'profile_nickname',
		});
		const { state, stateCookie } = await startConnect();

		const res = await request(app.getHttpServer())
			.get(`/notifications/kakao/callback?code=abc&state=${state}`)
			.set('Cookie', stateCookie)
			.expect(302);

		expect(res.headers.location).toContain('/settings?kakao=cancelled');
		const channels = await db.select().from(notificationChannels).where(eq(notificationChannels.userId, testUserId));
		expect(channels).toHaveLength(0);
	});

	test('연동에 성공하면 토큰을 저장하고 알림 방법을 kakao로 바꾼다.', async () => {
		const { state, stateCookie } = await startConnect();

		const res = await request(app.getHttpServer())
			.get(`/notifications/kakao/callback?code=abc&state=${state}`)
			.set('Cookie', stateCookie)
			.expect(302);

		expect(res.headers.location).toContain('/settings?kakao=connected');

		const [channel] = await db
			.select()
			.from(notificationChannels)
			.where(and(eq(notificationChannels.userId, testUserId), eq(notificationChannels.provider, 'kakao')));
		expect(channel).toMatchObject({
			externalId: '12345',
			accessToken: 'kakao-access',
			refreshToken: 'kakao-refresh',
			status: 'active',
		});
		expect(channel.refreshTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 59 * 24 * 60 * 60 * 1000);

		const [user] = await db.select().from(users).where(eq(users.id, testUserId));
		expect(user.notificationMethod).toBe('kakao');

		const settings = await request(app.getHttpServer())
			.get('/notifications/settings')
			.set('Cookie', `access_token=${accessToken}`)
			.expect(200);
		expect(settings.body).toEqual({ notificationMethod: 'kakao', kakaoStatus: 'active' });
	});

	test('revoked 상태에서 다시 연동하면 같은 행을 active로 갱신한다.', async () => {
		await db.update(notificationChannels).set({ status: 'revoked' }).where(eq(notificationChannels.userId, testUserId));
		const { state, stateCookie } = await startConnect();

		await request(app.getHttpServer())
			.get(`/notifications/kakao/callback?code=abc&state=${state}`)
			.set('Cookie', stateCookie)
			.expect(302);

		const channels = await db.select().from(notificationChannels).where(eq(notificationChannels.userId, testUserId));
		expect(channels).toHaveLength(1);
		expect(channels[0].status).toBe('active');
	});

	describe('PATCH /notifications/settings', () => {
		function patchSettings(body: object) {
			return request(app.getHttpServer())
				.patch('/notifications/settings')
				.set('Cookie', `access_token=${accessToken}`)
				.send(body);
		}

		test('알림 방법을 manual로 바꾸면 바뀐 설정을 반환한다.', async () => {
			const res = await patchSettings({ notificationMethod: 'manual' }).expect(200);

			expect(res.body).toEqual({ notificationMethod: 'manual', kakaoStatus: 'active' });
		});

		test('카카오 채널이 active면 kakao로 다시 바꿀 수 있다.', async () => {
			const res = await patchSettings({ notificationMethod: 'kakao' }).expect(200);

			expect(res.body.notificationMethod).toBe('kakao');
		});

		test('카카오 채널이 revoked면 kakao로 바꿀 수 없다.', async () => {
			await db
				.update(notificationChannels)
				.set({ status: 'revoked' })
				.where(eq(notificationChannels.userId, testUserId));

			await patchSettings({ notificationMethod: 'kakao' }).expect(400);
		});

		test('지원하지 않는 알림 방법은 400을 반환한다.', async () => {
			await patchSettings({ notificationMethod: 'slack' }).expect(400);
			await patchSettings({}).expect(400);
		});

		test('본문 없이 요청해도 500이 아니라 400을 반환한다.', async () => {
			await request(app.getHttpServer())
				.patch('/notifications/settings')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(400);
		});
	});
});
