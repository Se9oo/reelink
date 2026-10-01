import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { DRIZZLE, type DrizzleDb } from './../src/db/drizzle.module.js';
import { users, folders } from './../src/db/schema.js';
import cookieParser from 'cookie-parser';

describe('FoldersController (e2e)', () => {
	let app: INestApplication;
	let db: DrizzleDb;
	let accessToken: string;
	let testUserId: string;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.use(cookieParser());
		await app.init();

		db = app.get(DRIZZLE);
		const jwt = app.get(JwtService);

		// JwtAuthGuard가 접근하는 건 DB가 아니라 쿠키 속 JWT라, 실제 OAuth 로그인 없이
		// 테스트 유저를 직접 insert하고 JwtService로 같은 모양의 토큰만 만들면 인증을 통과함
		const [testUser] = await db
			.insert(users)
			.values({ email: 'folders-e2e@test.com', nickname: '폴더테스트' })
			.returning();
		testUserId = testUser.id;
		accessToken = await jwt.signAsync({ sub: testUserId });
	});

	afterAll(async () => {
		// users를 지우면 folders.userId FK의 onDelete: 'cascade'로 생성된 폴더도 같이 정리됨
		await db.delete(users).where(eq(users.id, testUserId));
		await app.close();
	});

	describe('Post /folders', () => {
		test('최상위 폴더를 생성하고 201과 생성된 폴더를 반환한다', async () => {
			const res = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			expect(res.body).toMatchObject({
				name: '개발',
				parentFolderId: null,
				userId: testUserId,
				isSystem: false,
			});
			expect(res.body.id).toBeDefined();
			expect(typeof res.body.sortOrder).toBe('number');
		});

		test('parentFolderId를 보내면 그 폴더 밑에 자식 폴더로 생성된다.', async () => {
			// 부모 폴더 생성
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			const parentFolderId = parent.body.id;

			const res2 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'React', parentFolderId })
				.expect(201);

			expect(res2.body).toMatchObject({
				name: 'React',
				parentFolderId,
				userId: testUserId,
				isSystem: false,
			});
		});

		test('같은 부모 밑에 폴더가 이미 있으면 sortOrder가 기존 sortOrder 최댓값 + 1이 된다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			const parentFolderId = parent.body.id;

			const child1 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'React', parentFolderId });

			const child2 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'Nest', parentFolderId });

			expect(child2.body.sortOrder).toEqual(child1.body.sortOrder + 1);
		});

		test('인증 쿠키가 없으면 401을 반환한다', async () => {
			await request(app.getHttpServer()).post('/folders').send({ name: '개발' }).expect(401);
		});
	});

	describe('Get /folders', () => {
		test('폴더가 하나도 없으면 빈 배열을 반환한다.', async () => {
			const [emptyUser] = await db.insert(users).values({ email: '...', nickname: '...' }).returning();
			const jwt = app.get(JwtService);
			const emptyUserToken = await jwt.signAsync({ sub: emptyUser.id });

			const res = await request(app.getHttpServer())
				.get('/folders')
				.set('Cookie', `access_token=${emptyUserToken}`)
				.expect(200);

			expect(res.body).toEqual([]);

			await db.delete(users).where(eq(users.id, emptyUser.id));
		});

		test('본인 폴더 전체를 flat 배열로 반환한다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			const parentFolderId = parent.body.id;

			const child1 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'React', parentFolderId })
				.expect(201);

			const child2 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'Next.js', parentFolderId })
				.expect(201);

			const child3 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'Nest', parentFolderId })
				.expect(201);

			const child4 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'Drizzle', parentFolderId })
				.expect(201);

			const myFolders = await request(app.getHttpServer())
				.get('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			[child1, child2, child3, child4].forEach((element) => {
				expect(element.body).toMatchObject({ parentFolderId });
			});

			expect(myFolders.body).toEqual(
				expect.arrayContaining([parent.body, child1.body, child2.body, child3.body, child4.body]),
			);
		});

		test('인증 쿠키가 없으면 401을 리턴한다.', async () => {
			await request(app.getHttpServer()).get('/folders').expect(401);
		});

		test('폴더 조회시 다른 사용자의 폴더는 보이지 않는다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '다른이메일', nickname: '다른유저' }).returning();

			const jwt = app.get(JwtService);
			const otherAccessToken = await jwt.signAsync({ sub: otherUser.id });

			const otherFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherAccessToken}`)
				.send({ name: '남의 폴더' });

			const res = await request(app.getHttpServer())
				.get('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			expect(res.body).not.toContainEqual(otherFolder.body);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('소프트 삭제된 폴더는 목록에서 제외된다.', async () => {
			const deletedFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '레시피' })
				.expect(201);

			await db.update(folders).set({ deletedAt: new Date() }).where(eq(folders.id, deletedFolder.body.id));

			const res = await request(app.getHttpServer())
				.get('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			const folderList = res.body;

			expect(folderList).not.toContainEqual(deletedFolder.body);
		});
	});
});
