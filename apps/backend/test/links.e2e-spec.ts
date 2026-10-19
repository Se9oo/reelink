import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { eq } from 'drizzle-orm';
import request from 'supertest';

import { DrizzleDb } from '../src/db/drizzle.module.js';
import { folders, links, users } from '../src/db/schema.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

vi.mock('../src/links/fetch-og-tags.js', () => ({
	fetchOgTags: vi.fn(async () => {
		await new Promise((resolve) => setTimeout(resolve, 150));

		return { title: 'OG 제목', thumbnailUrl: 'https://img.example.com/og.png' };
	}),
}));

describe('LinksController (e2e)', () => {
	let context: E2ETestContext;
	let app: INestApplication;
	let db: DrizzleDb;
	let accessToken: string;

	beforeAll(async () => {
		context = await setupE2EApp('links-e2e@test.com', '링크테스트');
		({ app, db, accessToken } = context);
	});

	afterAll(async () => {
		await teardownE2EApp(context);
	});

	describe('Post /links', () => {
		test('정상 등록시 201과 생성된 링크가 반환된다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: folder.body.id })
				.expect(201);

			expect(link.body).toMatchObject({ url: 'https://naver.com', folderId: folder.body.id });
		});

		test('url이 http/https 형식이 아니면 400 오류를 반환한다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'htt://naver.com', folderId: folder.body.id })
				.expect(400);
		});

		test('folderId가 없으면 400, 내 폴더가 아니면 404 오류를 반환한다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '다른이메일', nickname: '다른유저' }).returning();

			const jwt = app.get(JwtService);
			const otherAccessToken = await jwt.signAsync({ sub: otherUser.id });

			const otherFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherAccessToken}`)
				.send({ name: '남의 폴더' });

			await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: otherFolder.body.id })
				.expect(404);

			await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com' })
				.expect(400);
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			await request(app.getHttpServer())
				.post('/links')
				.send({ url: 'https://naver.com', folderId: folder.body.id })
				.expect(401);
		});
	});

	describe('Post /links 저장 이유 검증', () => {
		async function createFolder() {
			const res = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '저장 이유 검증 폴더' })
				.expect(201);

			return res.body as { id: string };
		}

		function create(body: object) {
			return request(app.getHttpServer()).post('/links').set('Cookie', `access_token=${accessToken}`).send(body);
		}

		test('저장 이유 앞뒤 공백은 지우고, 공백뿐이면 null로 저장한다.', async () => {
			const folder = await createFolder();

			const trimmed = await create({ url: 'https://naver.com', folderId: folder.id, savedReason: '  이유  ' }).expect(
				201,
			);
			const blank = await create({ url: 'https://naver.com', folderId: folder.id, savedReason: '   ' }).expect(201);

			expect(trimmed.body.savedReason).toBe('이유');
			expect(blank.body.savedReason).toBeNull();
		});

		test('저장 이유가 문자열이 아니거나 500자를 넘으면 400 오류를 반환한다.', async () => {
			const folder = await createFolder();

			await create({ url: 'https://naver.com', folderId: folder.id, savedReason: 123 }).expect(400);
			await create({ url: 'https://naver.com', folderId: folder.id, savedReason: 'a'.repeat(501) }).expect(400);
			await create({ url: 'https://naver.com', folderId: folder.id, savedReason: 'a'.repeat(500) }).expect(201);
		});

		test('저장 이유의 이모지도 한 글자로 센다.', async () => {
			const folder = await createFolder();

			await create({ url: 'https://naver.com', folderId: folder.id, savedReason: '👍'.repeat(500) }).expect(201);
			await create({ url: 'https://naver.com', folderId: folder.id, savedReason: '👍'.repeat(501) }).expect(400);
		});
	});

	describe('Delete /links/:id', () => {
		test('정상 삭제시 204를 반환하고 deletedAt이 채워진다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: folder.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/links/${link.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const [deletedLink] = await db.select().from(links).where(eq(links.id, link.body.id));

			expect(deletedLink.deletedAt).not.toBeNull();
		});

		test('남의 링크거나 존재하지 않는 링크면 404 오류를 반환한다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '다른이메일', nickname: '다른유저' }).returning();

			const jwt = app.get(JwtService);
			const otherAccessToken = await jwt.signAsync({ sub: otherUser.id });

			const otherFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherAccessToken}`)
				.send({ name: '남의 폴더' })
				.expect(201);

			const otherLink = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${otherAccessToken}`)
				.send({ url: 'https://naver.com', folderId: otherFolder.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/links/${otherLink.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);

			const randomLinkId = crypto.randomUUID();

			await request(app.getHttpServer())
				.delete(`/links/${randomLinkId}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: folder.body.id })
				.expect(201);

			await request(app.getHttpServer()).delete(`/links/${link.body.id}`).expect(401);
		});
	});

	describe('Get /links/search', () => {
		async function createFolder(name: string) {
			const res = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name })
				.expect(201);

			return res.body.id as string;
		}

		async function search(q: string) {
			const res = await request(app.getHttpServer())
				.get('/links/search')
				.query({ q })
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			return res.body.map((link: { id: string }) => link.id) as string[];
		}

		test('URL·제목·저장 이유를 대소문자 구분 없이 부분 일치로 찾는다.', async () => {
			const folderId = await createFolder('검색 폴더');
			const base = { userId: context.testUserId, folderId };

			const [byUrl] = await db
				.insert(links)
				.values({ ...base, url: 'https://zebra-url.com' })
				.returning();
			const [byTitle] = await db
				.insert(links)
				.values({ ...base, url: 'https://x.com', title: '큰 ZEBRA 이야기' })
				.returning();
			const [byReason] = await db
				.insert(links)
				.values({ ...base, url: 'https://y.com', savedReason: 'zebra 보려고' })
				.returning();
			await db.insert(links).values({ ...base, url: 'https://z.com', title: '관련 없음' });

			const ids = await search('Zebra');

			expect(ids).toHaveLength(3);
			expect(ids).toEqual(expect.arrayContaining([byUrl.id, byTitle.id, byReason.id]));
		});

		test('% 와 _ 는 와일드카드가 아니라 글자 그대로 찾는다.', async () => {
			const folderId = await createFolder('와일드카드 폴더');
			const base = { userId: context.testUserId, folderId, url: 'https://w.com' };

			const [percent] = await db
				.insert(links)
				.values({ ...base, title: '100% 할인 wild' })
				.returning();
			await db.insert(links).values({ ...base, title: '1000 할인 wild' });
			const [underscore] = await db
				.insert(links)
				.values({ ...base, title: 'snake_case wild' })
				.returning();
			await db.insert(links).values({ ...base, title: 'snakeXcase wild' });

			expect(await search('100%')).toEqual([percent.id]);
			expect(await search('snake_case')).toEqual([underscore.id]);
		});

		test('소프트 삭제된 링크와 다른 사용자의 링크는 제외된다.', async () => {
			const folderId = await createFolder('격리 폴더');
			await db.insert(links).values({
				userId: context.testUserId,
				folderId,
				url: 'https://q.com',
				title: 'quokka 삭제됨',
				deletedAt: new Date(),
			});

			const [otherUser] = await db
				.insert(users)
				.values({ email: '검색다른유저', nickname: '검색다른유저' })
				.returning();
			const [otherFolder] = await db.insert(folders).values({ userId: otherUser.id, name: '남의 폴더' }).returning();
			await db
				.insert(links)
				.values({ userId: otherUser.id, folderId: otherFolder.id, url: 'https://q2.com', title: 'quokka 남의 것' });

			expect(await search('quokka')).toEqual([]);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('검색어가 비어 있으면 빈 배열을 반환한다.', async () => {
			expect(await search('')).toEqual([]);
			expect(await search('   ')).toEqual([]);
		});

		test('검색어가 여러 번 전달돼 배열이 되어도 500이 아니라 빈 배열을 반환한다.', async () => {
			const res = await request(app.getHttpServer())
				.get('/links/search?q=a&q=b')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			expect(res.body).toEqual([]);
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			await request(app.getHttpServer()).get('/links/search').query({ q: 'a' }).expect(401);
		});
	});

	describe('Patch /links/:id/folder', () => {
		async function createFolder(name: string, token = accessToken) {
			const res = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${token}`)
				.send({ name })
				.expect(201);

			return res.body as { id: string };
		}

		async function createLink(folderId: string) {
			const res = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId })
				.expect(201);

			return res.body as { id: string };
		}

		function move(linkId: string, folderId: string, token = accessToken) {
			return request(app.getHttpServer())
				.patch(`/links/${linkId}/folder`)
				.set('Cookie', `access_token=${token}`)
				.send({ folderId });
		}

		test('정상 이동시 200과 바뀐 folderId가 반환된다.', async () => {
			const from = await createFolder('이동 전');
			const to = await createFolder('이동 후');
			const link = await createLink(from.id);

			const res = await move(link.id, to.id).expect(200);

			expect(res.body.folderId).toBe(to.id);

			const [saved] = await db.select().from(links).where(eq(links.id, link.id));

			expect(saved.folderId).toBe(to.id);
		});

		test('남의 링크거나 존재하지 않는 링크면 404 오류를 반환한다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '이동-다른이메일', nickname: '다른유저' }).returning();
			const otherToken = await app.get(JwtService).signAsync({ sub: otherUser.id });
			const otherFolder = await createFolder('남의 폴더', otherToken);
			const otherLink = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${otherToken}`)
				.send({ url: 'https://naver.com', folderId: otherFolder.id })
				.expect(201);
			const mine = await createFolder('내 폴더');

			await move(otherLink.body.id, mine.id).expect(404);
			await move(crypto.randomUUID(), mine.id).expect(404);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('대상 폴더가 남의 폴더이거나 삭제됐거나 없으면 404 오류를 반환하고 링크는 그대로다.', async () => {
			const [otherUser] = await db
				.insert(users)
				.values({ email: '이동2-다른이메일', nickname: '다른유저' })
				.returning();
			const otherToken = await app.get(JwtService).signAsync({ sub: otherUser.id });
			const otherFolder = await createFolder('남의 폴더', otherToken);
			const from = await createFolder('원래 폴더');
			const deleted = await createFolder('삭제될 폴더');
			const link = await createLink(from.id);

			await request(app.getHttpServer())
				.delete(`/folders/${deleted.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			await move(link.id, otherFolder.id).expect(404);
			await move(link.id, deleted.id).expect(404);
			await move(link.id, crypto.randomUUID()).expect(404);

			const [saved] = await db.select().from(links).where(eq(links.id, link.id));

			expect(saved.folderId).toBe(from.id);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('삭제된 링크는 이동할 수 없다.', async () => {
			const from = await createFolder('삭제 링크 폴더');
			const to = await createFolder('삭제 링크 대상');
			const link = await createLink(from.id);

			await request(app.getHttpServer())
				.delete(`/links/${link.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			await move(link.id, to.id).expect(404);
		});

		test('folderId가 없으면 400 오류를 반환한다.', async () => {
			const from = await createFolder('빈 바디 폴더');
			const link = await createLink(from.id);

			await request(app.getHttpServer())
				.patch(`/links/${link.id}/folder`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({})
				.expect(400);
		});

		test('uuid 형식이 아닌 링크 id나 folderId면 400 오류를 반환한다.', async () => {
			const from = await createFolder('uuid 검증 폴더');
			const link = await createLink(from.id);

			await move('not-a-uuid', from.id).expect(400);
			await move(link.id, 'not-a-uuid').expect(400);
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			await request(app.getHttpServer())
				.patch(`/links/${crypto.randomUUID()}/folder`)
				.send({ folderId: crypto.randomUUID() })
				.expect(401);
		});
	});

	describe('Patch /links/:id', () => {
		async function createLinkInNewFolder() {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '수정 테스트 폴더' })
				.expect(201);

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: folder.body.id, savedReason: '원래 이유' })
				.expect(201);

			await db.update(links).set({ title: '원래 제목' }).where(eq(links.id, link.body.id));

			return link.body as { id: string };
		}

		function update(linkId: string, body: object, token = accessToken) {
			return request(app.getHttpServer()).patch(`/links/${linkId}`).set('Cookie', `access_token=${token}`).send(body);
		}

		test('제목과 저장 이유를 함께 수정하면 200과 수정된 링크가 반환된다.', async () => {
			const link = await createLinkInNewFolder();

			const res = await update(link.id, { title: '새 제목', savedReason: '새 이유' }).expect(200);

			expect(res.body).toMatchObject({ id: link.id, title: '새 제목', savedReason: '새 이유' });

			const [saved] = await db.select().from(links).where(eq(links.id, link.id));

			expect(saved).toMatchObject({ title: '새 제목', savedReason: '새 이유' });
		});

		test('보낸 필드만 바꾸고 나머지는 그대로 둔다.', async () => {
			const link = await createLinkInNewFolder();

			const res = await update(link.id, { savedReason: '이유만 수정' }).expect(200);

			expect(res.body).toMatchObject({ title: '원래 제목', savedReason: '이유만 수정' });
		});

		test('앞뒤 공백은 제거하고 빈 문자열이나 null은 null로 저장한다.', async () => {
			const link = await createLinkInNewFolder();

			const trimmed = await update(link.id, { title: '  공백 제목  ' }).expect(200);

			expect(trimmed.body.title).toBe('공백 제목');

			const cleared = await update(link.id, { title: '   ', savedReason: null }).expect(200);

			expect(cleared.body).toMatchObject({ title: null, savedReason: null });
		});

		test('OG 추출이 늦게 끝나도 그 사이 사용자가 고친 제목은 덮어쓰지 않고 썸네일만 채운다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'OG 경합 폴더' })
				.expect(201);
			const created = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: folder.body.id })
				.expect(201);

			await update(created.body.id, { title: '내가 고친 제목' }).expect(200);
			await new Promise((resolve) => setTimeout(resolve, 400));

			const [saved] = await db.select().from(links).where(eq(links.id, created.body.id));

			expect(saved.title).toBe('내가 고친 제목');
			expect(saved.thumbnailUrl).toBe('https://img.example.com/og.png');
		});

		test('제목이나 저장 이유가 500자를 넘으면 400 오류를 반환한다.', async () => {
			const link = await createLinkInNewFolder();

			await update(link.id, { title: 'a'.repeat(501) }).expect(400);
			await update(link.id, { savedReason: 'a'.repeat(501) }).expect(400);
			await update(link.id, { title: 'a'.repeat(500) }).expect(200);
		});

		test('수정할 필드가 없거나 문자열이 아니면 400 오류를 반환한다.', async () => {
			const link = await createLinkInNewFolder();

			await update(link.id, {}).expect(400);
			await update(link.id, { title: 123 }).expect(400);
			await update(link.id, { savedReason: ['a'] }).expect(400);
		});

		test('uuid 형식이 아닌 링크 id면 400 오류를 반환한다.', async () => {
			await update('not-a-uuid', { title: '제목' }).expect(400);
		});

		test('남의 링크거나 존재하지 않거나 삭제된 링크면 404 오류를 반환한다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '수정-다른이메일', nickname: '다른유저' }).returning();
			const otherToken = await app.get(JwtService).signAsync({ sub: otherUser.id });
			const otherFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherToken}`)
				.send({ name: '남의 폴더' })
				.expect(201);
			const otherLink = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${otherToken}`)
				.send({ url: 'https://naver.com', folderId: otherFolder.body.id })
				.expect(201);
			const deleted = await createLinkInNewFolder();

			await request(app.getHttpServer())
				.delete(`/links/${deleted.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			await update(otherLink.body.id, { title: '탈취' }).expect(404);
			await update(crypto.randomUUID(), { title: '제목' }).expect(404);
			await update(deleted.id, { title: '제목' }).expect(404);

			const [untouched] = await db.select().from(links).where(eq(links.id, otherLink.body.id));

			expect(untouched.title).not.toBe('탈취');

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			await request(app.getHttpServer()).patch(`/links/${crypto.randomUUID()}`).send({ title: '제목' }).expect(401);
		});
	});
});
