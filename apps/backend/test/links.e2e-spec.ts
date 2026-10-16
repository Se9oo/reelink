import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { eq } from 'drizzle-orm';
import request from 'supertest';

import { DrizzleDb } from '../src/db/drizzle.module.js';
import { folders, links, users } from '../src/db/schema.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

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
});
