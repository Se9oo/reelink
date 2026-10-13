import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { eq } from 'drizzle-orm';
import request from 'supertest';

import { AuthService } from '../src/auth/auth.service.js';

import { type DrizzleDb } from './../src/db/drizzle.module.js';
import { users } from './../src/db/schema.js';
import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

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
});
