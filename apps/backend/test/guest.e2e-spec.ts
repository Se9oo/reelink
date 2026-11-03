import { INestApplication } from '@nestjs/common';

import { and, asc, eq, isNull } from 'drizzle-orm';
import request from 'supertest';

import { AuthService } from '../src/auth/auth.service.js';
import { type DrizzleDb } from '../src/db/drizzle.module.js';
import { accounts, folders, links, refreshTokens, users } from '../src/db/schema.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

describe('게스트 모드 (e2e)', () => {
	let context: E2ETestContext;
	let app: INestApplication;
	let db: DrizzleDb;
	let authService: AuthService;

	beforeAll(async () => {
		context = await setupE2EApp('guest-e2e@test.com', '게스트테스트');
		({ app, db } = context);
		authService = app.get(AuthService);
	});

	afterAll(async () => {
		await teardownE2EApp(context);
	});

	function cookieValue(res: request.Response, name: string) {
		const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith(`${name}=`));
		return cookie?.split(';')[0].slice(name.length + 1);
	}

	function profile(providerAccountId = crypto.randomUUID()) {
		return { provider: 'github', providerAccountId, email: 'claim@test.com', nickname: '이어받기' };
	}

	describe('POST /auth/guest', () => {
		test('게스트를 만들고 쿠키를 굽는다. /auth/me는 isGuest를 준다', async () => {
			const res = await request(app.getHttpServer()).post('/auth/guest').expect(204);

			const me = await request(app.getHttpServer())
				.get('/auth/me')
				.set('Cookie', `access_token=${cookieValue(res, 'access_token')}`)
				.expect(200);

			expect(me.body).toMatchObject({ nickname: 'Guest', isGuest: true });
			expect(cookieValue(res, 'has_session')).toBe('1');

			await db.delete(users).where(eq(users.id, me.body.id));
		});

		test('유효한 refresh 쿠키가 있으면 새 게스트를 만들지 않고 같은 사용자로 이어간다', async () => {
			const guest = await authService.createGuest();
			const { refreshToken } = await authService.issueTokens(guest.id);

			const res = await request(app.getHttpServer())
				.post('/auth/guest')
				.set('Cookie', `refresh_token=${refreshToken}`)
				.expect(204);

			const me = await request(app.getHttpServer())
				.get('/auth/me')
				.set('Cookie', `access_token=${cookieValue(res, 'access_token')}`)
				.expect(200);

			expect(me.body.id).toBe(guest.id);

			await db.delete(users).where(eq(users.id, guest.id));
		});

		test('refresh token 확인 중 무효 토큰이 아닌 에러가 나면 새 게스트를 만들지 않고 실패한다', async () => {
			const createSpy = vi.spyOn(authService, 'createGuest');
			const rotateSpy = vi.spyOn(authService, 'rotateRefreshToken').mockRejectedValue(new Error('db down'));

			await request(app.getHttpServer()).post('/auth/guest').set('Cookie', 'refresh_token=whatever').expect(500);

			expect(createSpy).not.toHaveBeenCalled();
			createSpy.mockRestore();
			rotateSpy.mockRestore();
		});
	});

	describe('이어받기', () => {
		test('게스트 행이 그새 사라졌으면 새 사용자를 만든다', async () => {
			const user = await authService.findOrCreateUser(profile(), crypto.randomUUID());

			expect(user).toMatchObject({ email: 'claim@test.com', isGuest: false });
			expect(await db.select().from(accounts).where(eq(accounts.userId, user.id))).toHaveLength(1);

			await db.delete(users).where(eq(users.id, user.id));
		});

		test('처음 보는 계정이면 게스트 행을 정식 사용자로 바꾸고 게스트 refresh token을 지운다', async () => {
			const guest = await authService.createGuest();
			const { refreshToken } = await authService.issueTokens(guest.id);
			const guestId = await authService.findGuestIdBySession(refreshToken);

			const user = await authService.findOrCreateUser(profile(), guestId);

			expect(user).toMatchObject({ id: guest.id, email: 'claim@test.com', nickname: '이어받기', isGuest: false });
			expect(await db.select().from(accounts).where(eq(accounts.userId, guest.id))).toHaveLength(1);
			expect(await db.select().from(refreshTokens).where(eq(refreshTokens.userId, guest.id))).toHaveLength(0);

			await db.delete(users).where(eq(users.id, guest.id));
		});

		test('이미 가입된 계정이면 폴더를 기존 최상위 뒤에 붙이고 미분류를 합친 뒤 게스트를 지운다', async () => {
			const providerAccountId = crypto.randomUUID();
			const existing = await authService.findOrCreateUser(profile(providerAccountId));
			const [existingUncategorized] = await db
				.insert(folders)
				.values([
					{ userId: existing.id, name: '미분류', isSystem: true, sortOrder: 0 },
					{ userId: existing.id, name: '기존', sortOrder: 1 },
				])
				.returning();
			await db
				.insert(folders)
				.values({ userId: existing.id, name: '기존 하위', parentFolderId: existingUncategorized.id, sortOrder: 0 });

			const guest = await authService.createGuest();
			const [guestB, guestA, guestUncategorized] = await db
				.insert(folders)
				.values([
					{ userId: guest.id, name: 'B', sortOrder: 5 },
					{ userId: guest.id, name: 'A', sortOrder: 2 },
					{ userId: guest.id, name: '미분류', isSystem: true, sortOrder: 9 },
				])
				.returning();
			const [guestSub] = await db
				.insert(folders)
				.values({ userId: guest.id, name: '게스트 하위', parentFolderId: guestUncategorized.id, sortOrder: 0 })
				.returning();
			const [uncategorizedLink, deletedLink] = await db
				.insert(links)
				.values([
					{ userId: guest.id, folderId: guestUncategorized.id, url: 'https://a.test' },
					{ userId: guest.id, folderId: guestA.id, url: 'https://b.test', deletedAt: new Date() },
				])
				.returning();

			await authService.findOrCreateUser(profile(providerAccountId), guest.id);

			const topLevel = await db
				.select({ name: folders.name, sortOrder: folders.sortOrder })
				.from(folders)
				.where(and(eq(folders.userId, existing.id), isNull(folders.parentFolderId)))
				.orderBy(asc(folders.sortOrder));
			expect(topLevel).toEqual([
				{ name: '미분류', sortOrder: 0 },
				{ name: '기존', sortOrder: 1 },
				{ name: 'A', sortOrder: 2 },
				{ name: 'B', sortOrder: 3 },
			]);

			const [movedSub] = await db.select().from(folders).where(eq(folders.id, guestSub.id));
			expect(movedSub).toMatchObject({ userId: existing.id, parentFolderId: existingUncategorized.id, sortOrder: 1 });

			const [movedLink] = await db.select().from(links).where(eq(links.id, uncategorizedLink.id));
			expect(movedLink).toMatchObject({ userId: existing.id, folderId: existingUncategorized.id });

			const [movedDeletedLink] = await db.select().from(links).where(eq(links.id, deletedLink.id));
			expect(movedDeletedLink).toMatchObject({ userId: existing.id, folderId: guestA.id });
			expect(movedDeletedLink.deletedAt).not.toBeNull();

			expect(await db.select().from(folders).where(eq(folders.id, guestB.id))).toHaveLength(1);
			expect(await db.select().from(users).where(eq(users.id, guest.id))).toHaveLength(0);

			await db.delete(users).where(eq(users.id, existing.id));
		});

		test('기존 미분류가 휴지통에 있으면 합치지 않고 게스트 미분류를 그대로 가져간다', async () => {
			const providerAccountId = crypto.randomUUID();
			const existing = await authService.findOrCreateUser(profile(providerAccountId));
			await db
				.insert(folders)
				.values({ userId: existing.id, name: '미분류', isSystem: true, sortOrder: 0, deletedAt: new Date() });

			const guest = await authService.createGuest();
			const [guestUncategorized] = await db
				.insert(folders)
				.values({ userId: guest.id, name: '미분류', isSystem: true, sortOrder: 0 })
				.returning();

			await authService.findOrCreateUser(profile(providerAccountId), guest.id);

			const [moved] = await db.select().from(folders).where(eq(folders.id, guestUncategorized.id));
			expect(moved).toMatchObject({ userId: existing.id, sortOrder: 1, deletedAt: null });

			await db.delete(users).where(eq(users.id, existing.id));
		});
	});

	test('게스트가 아니면 findGuestIdBySession은 undefined를 준다', async () => {
		const { refreshToken } = await authService.issueTokens(context.testUserId);

		expect(await authService.findGuestIdBySession(refreshToken)).toBeUndefined();
	});

	test('정리 크론은 살아있는 refresh token이 없는 게스트만 지운다', async () => {
		const abandoned = await authService.createGuest();
		await db
			.insert(refreshTokens)
			.values({ userId: abandoned.id, tokenHash: crypto.randomUUID(), expiresAt: new Date(Date.now() - 1000) });
		const active = await authService.createGuest();
		await authService.issueTokens(active.id);

		await authService.deleteAbandonedGuests(new Date());

		expect(await db.select().from(users).where(eq(users.id, abandoned.id))).toHaveLength(0);
		expect(await db.select().from(users).where(eq(users.id, active.id))).toHaveLength(1);
		expect(await db.select().from(users).where(eq(users.id, context.testUserId))).toHaveLength(1);

		await db.delete(users).where(eq(users.id, active.id));
	});

	test('게스트는 알림 연동·설정 변경이 403이다', async () => {
		const guest = await authService.createGuest();
		const { accessToken } = await authService.issueTokens(guest.id);
		const cookie = `access_token=${accessToken}`;

		await request(app.getHttpServer()).get('/notifications/kakao/connect').set('Cookie', cookie).expect(403);
		await request(app.getHttpServer())
			.patch('/notifications/settings')
			.set('Cookie', cookie)
			.send({ notificationMethod: 'manual' })
			.expect(403);

		await db.delete(users).where(eq(users.id, guest.id));
	});
});
