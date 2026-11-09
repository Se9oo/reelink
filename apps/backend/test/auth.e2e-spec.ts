import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import request from 'supertest';

import { AuthService } from '../src/auth/auth.service.js';

import { type DrizzleDb } from './../src/db/drizzle.module.js';
import { accounts, folders, links, notificationChannels, refreshTokens, users } from './../src/db/schema.js';
import { unlinkKakaoUser } from './../src/notifications/kakao-api.js';
import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

vi.mock('../src/notifications/kakao-api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/notifications/kakao-api.js')>()),
	unlinkKakaoUser: vi.fn(async () => {}),
}));

describe('AuthService / AuthController (e2e)', () => {
	let context: E2ETestContext;
	let app: INestApplication;
	let db: DrizzleDb;
	let authService: AuthService;

	beforeAll(async () => {
		context = await setupE2EApp('auth-e2e@test.com', '인증테스트');
		({ app, db } = context);
		authService = app.get(AuthService);
	});

	afterAll(async () => {
		await teardownE2EApp(context);
	});

	describe('findOrCreateUser', () => {
		test('신규 유저는 avatarUrl과 함께 생성된다', async () => {
			const user = await authService.findOrCreateUser({
				provider: 'github',
				providerAccountId: crypto.randomUUID(),
				email: 'new@test.com',
				nickname: '신규',
				avatarUrl: 'https://img.test/a.png',
			});

			expect(user.avatarUrl).toEqual('https://img.test/a.png');

			await db.delete(users).where(eq(users.id, user.id));
		});

		test('다음 로그인에서 avatarUrl이 달라지면 갱신한다', async () => {
			const providerAccountId = crypto.randomUUID();
			const first = await authService.findOrCreateUser({
				provider: 'github',
				providerAccountId,
				email: 'update@test.com',
				nickname: '유저',
				avatarUrl: 'https://img.test/old.png',
			});

			const updateSpy = vi.spyOn(db, 'update');

			const second = await authService.findOrCreateUser({
				provider: 'github',
				providerAccountId,
				email: 'update@test.com',
				nickname: '유저',
				avatarUrl: 'https://img.test/new.png',
			});

			expect(second.avatarUrl).toEqual('https://img.test/new.png');
			expect(updateSpy).toHaveBeenCalledTimes(1);

			updateSpy.mockRestore();
			await db.delete(users).where(eq(users.id, first.id));
		});

		test('다음 로그인에서 avatarUrl이 같으면 update를 실행하지 않는다', async () => {
			const providerAccountId = crypto.randomUUID();
			const first = await authService.findOrCreateUser({
				provider: 'github',
				providerAccountId,
				email: 'same@test.com',
				nickname: '유저',
				avatarUrl: 'https://img.test/same.png',
			});

			const updateSpy = vi.spyOn(db, 'update');

			const second = await authService.findOrCreateUser({
				provider: 'github',
				providerAccountId,
				email: 'same@test.com',
				nickname: '유저',
				avatarUrl: 'https://img.test/same.png',
			});

			expect(second.avatarUrl).toEqual('https://img.test/same.png');
			expect(updateSpy).not.toHaveBeenCalled();

			updateSpy.mockRestore();
			await db.delete(users).where(eq(users.id, first.id));
		});

		test('provider가 avatarUrl을 주지 않으면 기존 값을 유지한다', async () => {
			const providerAccountId = crypto.randomUUID();
			const first = await authService.findOrCreateUser({
				provider: 'github',
				providerAccountId,
				email: 'keep@test.com',
				nickname: '유저',
				avatarUrl: 'https://img.test/keep.png',
			});

			const second = await authService.findOrCreateUser({
				provider: 'github',
				providerAccountId,
				email: 'keep@test.com',
				nickname: '유저',
			});

			expect(second.avatarUrl).toEqual('https://img.test/keep.png');

			await db.delete(users).where(eq(users.id, first.id));
		});
	});

	describe('GET /auth/me', () => {
		test('인증 쿠키가 없으면 401을 반환한다', async () => {
			await request(app.getHttpServer()).get('/auth/me').expect(401);
		});

		test('avatarUrl을 포함한 유저 정보를 반환한다', async () => {
			const [testUser] = await db
				.insert(users)
				.values({ email: 'me@test.com', nickname: '미', avatarUrl: 'https://img.test/me.png' })
				.returning();

			const jwt = app.get(JwtService);
			const accessToken = await jwt.signAsync({ sub: testUser.id });

			const res = await request(app.getHttpServer())
				.get('/auth/me')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			expect(res.body).toMatchObject({ id: testUser.id, avatarUrl: 'https://img.test/me.png' });

			await db.delete(users).where(eq(users.id, testUser.id));
		});
	});

	describe('deleteExpiredRefreshTokens', () => {
		test('만료된 refresh token만 지운다', async () => {
			await authService.issueTokens(context.testUserId);
			const { refreshToken: alive } = await authService.issueTokens(context.testUserId);
			const aliveHash = createHash('sha256').update(alive).digest('hex');
			const now = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
			await db
				.update(refreshTokens)
				.set({ expiresAt: new Date(now.getTime() + 60_000) })
				.where(eq(refreshTokens.tokenHash, aliveHash));

			await authService.deleteExpiredRefreshTokens(now);

			const remaining = await db.select().from(refreshTokens).where(eq(refreshTokens.userId, context.testUserId));
			expect(remaining.map((row) => row.tokenHash)).toEqual([aliveHash]);
		});
	});

	describe('DELETE /auth/me', () => {
		async function createMember() {
			const [user] = await db.insert(users).values({ email: 'withdraw@test.com', nickname: '탈퇴' }).returning();
			const accessToken = await app.get(JwtService).signAsync({ sub: user.id });
			return { id: user.id, cookie: `access_token=${accessToken}` };
		}

		function withdraw(cookie: string) {
			return request(app.getHttpServer()).delete('/auth/me').set('Cookie', cookie);
		}

		afterEach(() => {
			vi.mocked(unlinkKakaoUser).mockReset();
		});

		test('인증 쿠키가 없으면 401을 반환한다', async () => {
			await request(app.getHttpServer()).delete('/auth/me').expect(401);
		});

		test('사용자와 폴더·링크를 지우고 인증 쿠키를 모두 지운다', async () => {
			const user = await createMember();
			const [folder] = await db.insert(folders).values({ userId: user.id, name: '폴더', sortOrder: 0 }).returning();
			await db.insert(links).values({ userId: user.id, folderId: folder.id, url: 'https://a.test' });

			const res = await withdraw(user.cookie).expect(204);

			expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
			expect(await db.select().from(links).where(eq(links.userId, user.id))).toHaveLength(0);
			const cookies = res.headers['set-cookie'] as unknown as string[];
			expect(cookies.map((cookie) => cookie.split('=')[0]).sort()).toEqual([
				'access_token',
				'has_session',
				'refresh_token',
			]);
			expect(unlinkKakaoUser).not.toHaveBeenCalled();
		});

		test('카카오 로그인·알림 연동이 있으면 그 회원번호로 카카오 연결을 한 번 끊는다', async () => {
			const user = await createMember();
			const kakaoId = crypto.randomUUID();
			await db.insert(accounts).values({ userId: user.id, provider: 'kakao', providerAccountId: kakaoId });
			await db.insert(notificationChannels).values({ userId: user.id, provider: 'kakao', externalId: kakaoId });

			await withdraw(user.cookie).expect(204);

			expect(unlinkKakaoUser).toHaveBeenCalledTimes(1);
			expect(unlinkKakaoUser).toHaveBeenCalledWith(kakaoId);
		});

		test('카카오 연결 끊기가 실패해도 탈퇴는 된다', async () => {
			const user = await createMember();
			await db
				.insert(notificationChannels)
				.values({ userId: user.id, provider: 'kakao', externalId: crypto.randomUUID() });
			vi.mocked(unlinkKakaoUser).mockRejectedValueOnce(new Error('kakao down'));

			await withdraw(user.cookie).expect(204);

			expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
		});
	});

	describe('refresh 쿠키 경로', () => {
		afterEach(() => {
			delete process.env.REFRESH_COOKIE_PATH;
		});

		function refreshCookieOf(res: request.Response) {
			return (res.headers['set-cookie'] as unknown as string[]).find((cookie) => cookie.startsWith('refresh_token='));
		}

		async function refresh() {
			const { refreshToken } = await authService.issueTokens(context.testUserId);

			return await request(app.getHttpServer())
				.post('/auth/refresh')
				.set('Cookie', `refresh_token=${refreshToken}`)
				.expect(204);
		}

		test('REFRESH_COOKIE_PATH가 없으면 /auth 경로로 refresh 쿠키를 굽는다', async () => {
			expect(refreshCookieOf(await refresh())).toContain('Path=/auth;');
		});

		test('REFRESH_COOKIE_PATH가 있으면 그 경로로 refresh 쿠키를 굽는다(Nginx /api 접두사 대응)', async () => {
			process.env.REFRESH_COOKIE_PATH = '/api/auth';

			expect(refreshCookieOf(await refresh())).toContain('Path=/api/auth;');
		});

		test('운영(NODE_ENV=production)에서는 인증 쿠키를 모두 Secure로 굽고, 그 외엔 Secure를 붙이지 않는다', async () => {
			const original = process.env.NODE_ENV;

			try {
				process.env.NODE_ENV = 'production';
				const prodCookies = (await refresh()).headers['set-cookie'] as unknown as string[];
				process.env.NODE_ENV = original;
				const devCookies = (await refresh()).headers['set-cookie'] as unknown as string[];

				expect(prodCookies).toHaveLength(3);
				expect(prodCookies.every((cookie) => cookie.includes('Secure'))).toBe(true);
				expect(devCookies.some((cookie) => cookie.includes('Secure'))).toBe(false);
			} finally {
				process.env.NODE_ENV = original;
			}
		});

		test('로그아웃은 refresh 쿠키를 구운 것과 같은 경로로 지운다', async () => {
			process.env.REFRESH_COOKIE_PATH = '/api/auth';

			const res = await request(app.getHttpServer()).post('/auth/logout').expect(204);

			expect(refreshCookieOf(res)).toContain('Path=/api/auth;');
		});
	});
});
