import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';

import { DrizzleDb } from '../src/db/drizzle.module.js';
import { folders, links, users } from '../src/db/schema.js';
import { classifyLinks, ClassifyLinksError } from '../src/links/classify-links.js';
import { REDIS, type RedisClient } from '../src/redis/redis.module.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

vi.mock('../src/links/fetch-og-tags.js', () => ({
	fetchOgTags: vi.fn(async () => ({ title: null, thumbnailUrl: null, description: null })),
}));

vi.mock('../src/links/classify-links.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/links/classify-links.js')>()),
	classifyLinks: vi.fn(),
}));

describe('AutoSort (e2e)', () => {
	let context: E2ETestContext;
	let app: INestApplication;
	let db: DrizzleDb;
	let redis: RedisClient;
	const createdUserIds: string[] = [];

	beforeAll(async () => {
		context = await setupE2EApp('auto-sort-e2e@test.com', '자동배치테스트');
		({ app, db } = context);
		redis = app.get<RedisClient>(REDIS);
	});

	beforeEach(() => {
		vi.mocked(classifyLinks).mockReset();
		vi.mocked(classifyLinks).mockImplementation(
			async (candidates, targets) => new Map(targets.map(({ id }) => [id, candidates[0]?.id ?? null])),
		);
	});

	afterAll(async () => {
		if (createdUserIds.length > 0) {
			await db.delete(users).where(inArray(users.id, createdUserIds));
		}

		await teardownE2EApp(context);
	});

	function quotaKey(userId: string) {
		const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).replaceAll('-', '');

		return `aisort:${userId}:${today}`;
	}

	async function createUser({ isGuest = false } = {}) {
		const [user] = await db
			.insert(users)
			.values({ email: isGuest ? '' : `${crypto.randomUUID()}@test.com`, nickname: '테스터', isGuest })
			.returning();
		createdUserIds.push(user.id);
		const token = await app.get(JwtService).signAsync({ sub: user.id });

		return { userId: user.id, token };
	}

	async function createFolder(
		userId: string,
		name: string,
		{ isSystem = false, parentFolderId = null as string | null } = {},
	) {
		const [folder] = await db.insert(folders).values({ userId, name, isSystem, parentFolderId }).returning();

		return folder;
	}

	async function createLinks(userId: string, folderId: string, count: number) {
		const rows = Array.from({ length: count }, (_, index) => ({
			userId,
			folderId,
			url: `https://example.com/${index}`,
			title: `링크 ${index}`,
			createdAt: new Date(Date.UTC(2026, 0, 1, 0, count - index)),
		}));

		return await db.insert(links).values(rows).returning();
	}

	function suggest(folderId: string, token: string, body?: unknown) {
		return request(app.getHttpServer())
			.post(`/folders/${folderId}/auto-sort`)
			.set('Cookie', `access_token=${token}`)
			.send(body as object);
	}

	function quota(token: string) {
		return request(app.getHttpServer()).get('/links/auto-sort/quota').set('Cookie', `access_token=${token}`);
	}

	describe('Post /folders/:id/auto-sort', () => {
		test('시스템 폴더의 링크를 오래된 순으로 보내고 일반 폴더만 경로와 함께 후보로 넘긴다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			const dev = await createFolder(userId, '개발');
			const frontend = await createFolder(userId, '프론트', { parentFolderId: dev.id });
			const created = await createLinks(userId, inbox.id, 3);
			await db.insert(links).values({ userId, folderId: frontend.id, url: 'https://react.dev', title: '리액트 문서' });

			const res = await suggest(inbox.id, token).expect(201);

			const oldestFirst = [...created]
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
				.map(({ id }) => id);
			expect(res.body.suggestions.map(({ linkId }: { linkId: string }) => linkId)).toEqual(oldestFirst);
			expect(res.body).toMatchObject({ remaining: 47, skipped: 0 });

			const [candidates] = vi.mocked(classifyLinks).mock.calls[0];
			expect(candidates).toHaveLength(2);
			expect(candidates).toContainEqual({ id: frontend.id, path: '개발/프론트', sampleTitles: ['리액트 문서'] });
			expect(candidates.map(({ id }) => id)).not.toContain(inbox.id);
		});

		test('일반 폴더면 400, 남의 폴더나 없는 폴더면 404, 게스트면 403 오류를 반환한다.', async () => {
			const { userId, token } = await createUser();
			const other = await createUser();
			const guest = await createUser({ isGuest: true });
			const normal = await createFolder(userId, '일반');
			const othersInbox = await createFolder(other.userId, '미분류', { isSystem: true });
			const guestInbox = await createFolder(guest.userId, '미분류', { isSystem: true });

			await suggest(normal.id, token).expect(400);
			await suggest(othersInbox.id, token).expect(404);
			await suggest(crypto.randomUUID(), token).expect(404);
			await suggest(guestInbox.id, guest.token).expect(403);
			expect(classifyLinks).not.toHaveBeenCalled();
		});

		test('남은 한도만큼만 보내고 나머지는 skipped로 알려준다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			await createFolder(userId, '개발');
			await createLinks(userId, inbox.id, 3);
			await redis.set(quotaKey(userId), '48', 'EX', 60);

			const res = await suggest(inbox.id, token).expect(201);

			expect(res.body.suggestions).toHaveLength(2);
			expect(res.body).toMatchObject({ remaining: 0, skipped: 1 });
		});

		test('한도를 다 썼으면 429 오류를 반환하고 AI를 부르지 않는다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			await createFolder(userId, '개발');
			await createLinks(userId, inbox.id, 1);
			await redis.set(quotaKey(userId), '50', 'EX', 60);

			await suggest(inbox.id, token).expect(429);

			expect(classifyLinks).not.toHaveBeenCalled();
			expect(await redis.get(quotaKey(userId))).toBe('50');
		});

		test('동시에 두 번 요청해도 합쳐서 한도를 넘게 보내지 않는다.', async () => {
			const { userId, token } = await createUser();
			const kakao = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			const uncategorized = await createFolder(userId, '미분류', { isSystem: true });
			await createFolder(userId, '개발');
			await createLinks(userId, kakao.id, 15);
			await createLinks(userId, uncategorized.id, 15);
			await redis.set(quotaKey(userId), '30', 'EX', 60);

			const results = await Promise.all([suggest(kakao.id, token), suggest(uncategorized.id, token)]);

			const sent = results
				.filter(({ status }) => status === 201)
				.reduce((sum, { body }) => sum + body.suggestions.length, 0);
			expect(sent).toBe(20);
			expect(await redis.get(quotaKey(userId))).toBe('50');
		});

		test('AI 호출이 실패하면 503 오류를 반환하고 차감한 한도를 되돌린다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			await createFolder(userId, '개발');
			await createLinks(userId, inbox.id, 3);
			await redis.set(quotaKey(userId), '10', 'EX', 60);
			vi.mocked(classifyLinks).mockRejectedValueOnce(new ClassifyLinksError('down'));

			await suggest(inbox.id, token).expect(503);

			expect(await redis.get(quotaKey(userId))).toBe('10');
		});

		test('AI 호출이 끝난 뒤 Redis 조회가 실패해도 추천 결과와 남은 개수를 돌려준다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			await createFolder(userId, '개발');
			await createLinks(userId, inbox.id, 3);
			await redis.set(quotaKey(userId), '10', 'EX', 60);
			const getSpy = vi.spyOn(redis, 'get').mockRejectedValue(new Error('Connection is closed.'));

			const res = await suggest(inbox.id, token).expect(201);
			getSpy.mockRestore();

			expect(res.body.suggestions).toHaveLength(3);
			expect(res.body.remaining).toBe(37);
		});

		test('Redis가 실패하면 AI를 부르지 않고 503 오류를 반환한다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			await createFolder(userId, '개발');
			await createLinks(userId, inbox.id, 1);
			vi.spyOn(redis, 'incrby').mockRejectedValueOnce(new Error('Connection is closed.'));

			await suggest(inbox.id, token).expect(503);

			expect(classifyLinks).not.toHaveBeenCalled();
		});

		test('일반 폴더가 하나도 없으면 AI를 부르지 않고 전부 맞는 폴더 없음으로 돌려준다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			await createLinks(userId, inbox.id, 2);

			const res = await suggest(inbox.id, token).expect(201);

			expect(res.body.suggestions.map(({ folderId }: { folderId: string | null }) => folderId)).toEqual([null, null]);
			expect(res.body).toMatchObject({ remaining: 50, skipped: 0 });
			expect(classifyLinks).not.toHaveBeenCalled();
		});

		test('빈 시스템 폴더면 빈 목록을 돌려주고 한도를 쓰지 않는다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			await createFolder(userId, '개발');

			const res = await suggest(inbox.id, token).expect(201);

			expect(res.body).toEqual({ suggestions: [], remaining: 50, skipped: 0 });
			expect(classifyLinks).not.toHaveBeenCalled();
		});

		test('삭제된 링크와 휴지통의 폴더는 보내지 않는다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			const live = await createFolder(userId, '개발');
			const trashed = await createFolder(userId, '버린 폴더');
			await db.update(folders).set({ deletedAt: new Date() }).where(eq(folders.id, trashed.id));
			const [kept, deleted] = await createLinks(userId, inbox.id, 2);
			await db.update(links).set({ deletedAt: new Date() }).where(eq(links.id, deleted.id));

			const res = await suggest(inbox.id, token).expect(201);

			expect(res.body.suggestions).toEqual([{ linkId: kept.id, folderId: live.id }]);
		});

		test('linkIds를 보내면 고른 링크만 보내고 그만큼만 한도를 쓴다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			await createFolder(userId, '개발');
			const [first, , third] = await createLinks(userId, inbox.id, 3);

			const res = await suggest(inbox.id, token, { linkIds: [first.id, third.id] }).expect(201);

			const [, sent] = vi.mocked(classifyLinks).mock.calls[0];
			expect(sent.map(({ id }) => id).sort()).toEqual([first.id, third.id].sort());
			expect(res.body).toMatchObject({ remaining: 48, skipped: 0 });
		});

		test('linkIds에 이 폴더에 없거나 삭제된 링크가 있으면 404, 비었거나 형식이 틀리면 400 오류를 반환한다.', async () => {
			const { userId, token } = await createUser();
			const inbox = await createFolder(userId, '카카오톡으로 등록', { isSystem: true });
			const dev = await createFolder(userId, '개발');
			const [inInbox, deleted] = await createLinks(userId, inbox.id, 2);
			const [elsewhere] = await createLinks(userId, dev.id, 1);
			await db.update(links).set({ deletedAt: new Date() }).where(eq(links.id, deleted.id));

			await suggest(inbox.id, token, { linkIds: [inInbox.id, elsewhere.id] }).expect(404);
			await suggest(inbox.id, token, { linkIds: [inInbox.id, deleted.id] }).expect(404);
			await suggest(inbox.id, token, { linkIds: [] }).expect(400);
			await suggest(inbox.id, token, { linkIds: ['not-uuid'] }).expect(400);
			await suggest(inbox.id, token, { linkIds: inInbox.id }).expect(400);
			expect(classifyLinks).not.toHaveBeenCalled();
		});
	});

	describe('Get /links/auto-sort/quota', () => {
		test('오늘 남은 개수를 돌려준다.', async () => {
			const { userId, token } = await createUser();

			expect((await quota(token).expect(200)).body).toEqual({ remaining: 50 });

			await redis.set(quotaKey(userId), '12', 'EX', 60);

			expect((await quota(token).expect(200)).body).toEqual({ remaining: 38 });
		});

		test('게스트면 403 오류를 반환한다.', async () => {
			const guest = await createUser({ isGuest: true });

			await quota(guest.token).expect(403);
		});

		test('Redis가 실패하면 503 오류를 반환한다.', async () => {
			const { token } = await createUser();
			vi.spyOn(redis, 'get').mockRejectedValueOnce(new Error('Connection is closed.'));

			await quota(token).expect(503);
		});
	});
});
