import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import request from 'supertest';

import { DrizzleDb } from '../src/db/drizzle.module.js';
import { users } from '../src/db/schema.js';

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
});
