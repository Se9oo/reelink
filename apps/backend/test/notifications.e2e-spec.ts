import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { and, eq } from 'drizzle-orm';
import request from 'supertest';

import { DrizzleDb } from '../src/db/drizzle.module.js';
import { notificationChannels, pushSubscriptions, users } from '../src/db/schema.js';
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

	async function startConnect(query = '') {
		const res = await request(app.getHttpServer())
			.get(`/notifications/kakao/connect${query}`)
			.set('Cookie', `access_token=${accessToken}`)
			.expect(200);
		const state = new URL(res.body.url).searchParams.get('state');
		const stateCookie = (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

		return { state, stateCookie, url: res.body.url as string };
	}

	test('운영(NODE_ENV=production)에서는 state 쿠키를 Secure로 굽는다.', async () => {
		const original = process.env.NODE_ENV;

		try {
			process.env.NODE_ENV = 'production';
			const res = await request(app.getHttpServer())
				.get('/notifications/kakao/connect')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			expect((res.headers['set-cookie'] as unknown as string[])[0]).toContain('Secure');
		} finally {
			process.env.NODE_ENV = original;
		}
	});

	test('온보딩에서 시작한 연동은 취소해도 홈의 봇 단계로 돌아간다.', async () => {
		const { state, stateCookie } = await startConnect('?from=onboarding');

		const res = await request(app.getHttpServer())
			.get(`/notifications/kakao/callback?error=access_denied&state=${state}`)
			.set('Cookie', stateCookie)
			.expect(302);

		expect(res.headers.location).toMatch(/\/home\?onboarding=bot$/);
	});

	test('온보딩에서 시작한 연동이 성공해도 홈의 봇 단계로 돌아간다.', async () => {
		const { state, stateCookie } = await startConnect('?from=onboarding');

		const res = await request(app.getHttpServer())
			.get(`/notifications/kakao/callback?code=abc&state=${state}`)
			.set('Cookie', stateCookie)
			.expect(302);

		expect(res.headers.location).toMatch(/\/home\?onboarding=bot$/);
		await db.delete(notificationChannels).where(eq(notificationChannels.userId, testUserId));
	});

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
		expect(settings.body).toEqual({ notificationMethod: 'kakao', kakaoStatus: 'active', pushSubscriptionCount: 0 });
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

			expect(res.body).toEqual({ notificationMethod: 'manual', kakaoStatus: 'active', pushSubscriptionCount: 0 });
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

	describe('PUT, DELETE /notifications/push/subscription', () => {
		const endpoint = 'https://fcm.googleapis.com/fcm/send/abc';
		const body = { endpoint, keys: { p256dh: 'p256dh-key', auth: 'auth-key' } };

		function save(payload: object, token = accessToken) {
			return request(app.getHttpServer())
				.put('/notifications/push/subscription')
				.set('Cookie', `access_token=${token}`)
				.send(payload);
		}

		async function getRows() {
			return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
		}

		async function createUser(values: Partial<typeof users.$inferInsert> = {}) {
			const [user] = await db
				.insert(users)
				.values({ email: `push-${crypto.randomUUID()}@test.com`, nickname: '테스터', ...values })
				.returning();
			return { user, token: await app.get(JwtService).signAsync({ sub: user.id }) };
		}

		beforeEach(async () => {
			await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
		});

		test('구독을 저장하고, 같은 브라우저에서 다시 저장하면 키를 갱신한다.', async () => {
			await save(body).expect(204);
			await save({ endpoint, keys: { p256dh: 'new-p256dh', auth: 'new-auth' } }).expect(204);

			expect(await getRows()).toMatchObject([{ userId: testUserId, p256dhKey: 'new-p256dh', authKey: 'new-auth' }]);
		});

		test('같은 브라우저에서 다른 계정이 구독하면 구독이 그 계정으로 넘어간다.', async () => {
			const other = await createUser();

			await save(body).expect(204);
			await save(body, other.token).expect(204);

			expect(await getRows()).toMatchObject([{ userId: other.user.id }]);

			await db.delete(users).where(eq(users.id, other.user.id));
		});

		test('알려진 푸시 서비스의 https 주소가 아니거나 키가 없으면 400 오류를 반환한다.', async () => {
			await save({ ...body, endpoint: 'https://evil.example.com/push' }).expect(400);
			await save({ ...body, endpoint: 'https://fcm.googleapis.com.evil.com/x' }).expect(400);
			await save({ ...body, endpoint: 'http://fcm.googleapis.com/fcm/send/abc' }).expect(400);
			await save({ ...body, endpoint: 'not a url' }).expect(400);
			await save({ endpoint, keys: { p256dh: 'p' } }).expect(400);
			await save({ endpoint }).expect(400);

			expect(await getRows()).toEqual([]);
		});

		test('게스트는 구독할 수 없다(403).', async () => {
			const guest = await createUser({ isGuest: true });

			await save(body, guest.token).expect(403);

			await db.delete(users).where(eq(users.id, guest.user.id));
		});

		test('DELETE는 내 구독만 지운다.', async () => {
			const other = await createUser();
			await save(body).expect(204);

			await request(app.getHttpServer())
				.delete('/notifications/push/subscription')
				.set('Cookie', `access_token=${other.token}`)
				.send({ endpoint })
				.expect(204);
			expect(await getRows()).toHaveLength(1);

			await request(app.getHttpServer())
				.delete('/notifications/push/subscription')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ endpoint })
				.expect(204);
			expect(await getRows()).toEqual([]);

			await db.delete(users).where(eq(users.id, other.user.id));
		});

		test('알림 설정 조회에 내 웹 푸시 구독 수(다른 기기 포함)가 담긴다.', async () => {
			const otherEndpoint = 'https://web.push.apple.com/other-device';
			await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, otherEndpoint));
			await save(body).expect(204);
			await save({ ...body, endpoint: otherEndpoint }).expect(204);

			const res = await request(app.getHttpServer())
				.get('/notifications/settings')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			expect(res.body.pushSubscriptionCount).toBe(2);

			await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, otherEndpoint));
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			await request(app.getHttpServer()).put('/notifications/push/subscription').send(body).expect(401);
			await request(app.getHttpServer()).delete('/notifications/push/subscription').send({ endpoint }).expect(401);
		});
	});
});
