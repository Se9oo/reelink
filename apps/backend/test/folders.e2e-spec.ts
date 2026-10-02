import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { DRIZZLE, type DrizzleDb } from './../src/db/drizzle.module.js';
import { users, folders, links } from './../src/db/schema.js';
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

	describe('Patch /folders:id', () => {
		test('본인 폴더 이름을 변경하면 200과 변경된 폴더를 반환한다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'Old' })
				.expect(201);

			const editedFolder = await request(app.getHttpServer())
				.patch(`/folders/${folder.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'New' })
				.expect(200);

			expect(editedFolder.body.name).toEqual('New');
		});

		test('존재하지 않는 폴더 id면 404 오류를 반환한다.', async () => {
			const randomFolderId = crypto.randomUUID();
			await request(app.getHttpServer())
				.patch(`/folders/${randomFolderId}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'test' })
				.expect(404);
		});

		test('다른 사용자의 폴더면 404 오류를 반환한다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '...', nickname: '...' }).returning();
			const jwt = app.get(JwtService);
			const otherUserToken = await jwt.signAsync({ sub: otherUser.id });

			const otherUserFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherUserToken}`)
				.send({ name: '다른 유저 폴더' })
				.expect(201);

			const otherUserFolderId = otherUserFolder.body.id;

			await request(app.getHttpServer())
				.patch(`/folders/${otherUserFolderId}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '이름 변경' })
				.expect(404);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('시스템 폴더는 이름 변경이 불가능하다.', async () => {
			const [systemFolder] = await db
				.insert(folders)
				.values({ name: '카카오톡 링크 폴더', isSystem: true, userId: testUserId, sortOrder: 0 })
				.returning();

			await request(app.getHttpServer())
				.patch(`/folders/${systemFolder.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '시스템 폴더 이름 변경' })
				.expect(403);
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			const [folder] = await db.insert(folders).values({ name: '폴더', userId: testUserId, sortOrder: 0 }).returning();

			await request(app.getHttpServer())
				.patch(`/folders/${folder.id}`)
				.send({ name: '시스템 폴더 이름 변경' })
				.expect(401);
		});

		test('parentFolderId를 보내면 다른 부모 폴더 밑으로 이동한다.', async () => {
			const folderA = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'A' })
				.expect(201);

			const folderB = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'B' })
				.expect(201);

			const moved = await request(app.getHttpServer())
				.patch(`/folders/${folderB.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ parentFolderId: folderA.body.id })
				.expect(200);

			expect(moved.body.parentFolderId).toEqual(folderA.body.id);
		});

		test('parentFolderId로 null을 보내면 최상위로 이동한다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '부모' })
				.expect(201);

			const child = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '자식', parentFolderId: parent.body.id })
				.expect(201);

			const moved = await request(app.getHttpServer())
				.patch(`/folders/${child.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ parentFolderId: null })
				.expect(200);

			expect(moved.body.parentFolderId).toBeNull();
		});

		test('이동하면 새 부모 기준 sortOrder가 재계산된다.', async () => {
			const newParent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '새 부모' })
				.expect(201);

			const existingChild = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '기존 자식', parentFolderId: newParent.body.id })
				.expect(201);

			const moving = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '이동할 폴더' })
				.expect(201);

			const moved = await request(app.getHttpServer())
				.patch(`/folders/${moving.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ parentFolderId: newParent.body.id })
				.expect(200);

			expect(moved.body.sortOrder).toEqual(existingChild.body.sortOrder + 1);
		});

		test('폴더를 자기 자신 밑으로 이동할 수 없다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '자기자신' })
				.expect(201);

			await request(app.getHttpServer())
				.patch(`/folders/${folder.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ parentFolderId: folder.body.id })
				.expect(400);
		});

		test('폴더를 자기 하위 폴더 밑으로 이동할 수 없다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '조상' })
				.expect(201);

			const child = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '자손', parentFolderId: parent.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.patch(`/folders/${parent.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ parentFolderId: child.body.id })
				.expect(400);
		});

		test('존재하지 않거나 남의 폴더로는 이동할 수 없다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '이동시도' })
				.expect(201);

			const randomFolderId = crypto.randomUUID();
			await request(app.getHttpServer())
				.patch(`/folders/${folder.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ parentFolderId: randomFolderId })
				.expect(404);

			const [otherUser] = await db.insert(users).values({ email: '...', nickname: '...' }).returning();
			const jwt = app.get(JwtService);
			const otherUserToken = await jwt.signAsync({ sub: otherUser.id });

			const otherUserFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherUserToken}`)
				.send({ name: '다른 유저 폴더' })
				.expect(201);

			await request(app.getHttpServer())
				.patch(`/folders/${folder.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.send({ parentFolderId: otherUserFolder.body.id })
				.expect(404);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});
	});

	describe('Delete /folders:id', () => {
		test('시스템 폴더를 삭제하는 경우 403 오류를 반환한다.', async () => {
			const randomFolderId = crypto.randomUUID();

			const [systemFolder] = await db
				.insert(folders)
				.values({ id: randomFolderId, userId: testUserId, isSystem: true, name: '시스템 폴더' })
				.returning();

			await request(app.getHttpServer())
				.delete(`/folders/${systemFolder.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(403);
		});

		test('폴더를 삭제하면 deletedAt이 채워진다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '개발' })
				.expect(201);

			const folderId = folder.body.id;

			await request(app.getHttpServer())
				.delete(`/folders/${folderId}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const [deletedFolder] = await db.select().from(folders).where(eq(folders.id, folderId));

			expect(deletedFolder.deletedAt).not.toBeNull();
		});

		test('하위 폴더가 있다면 그 하위 폴더도 같이 deleteAt이 채워진다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '최상위 폴더' })
				.expect(201);

			const parentId = parent.body.id;

			const childA = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'React', parentFolderId: parentId })
				.expect(201);

			const childA1 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'useMemo', parentFolderId: childA.body.id })
				.expect(201);

			const childA2 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: 'useCallback', parentFolderId: childA.body.id })
				.expect(201);

			const childB = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '레시피', parentFolderId: parentId })
				.expect(201);

			const childB1 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '볶음', parentFolderId: childB.body.id })
				.expect(201);

			const childB2 = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '찌개', parentFolderId: childB.body.id })
				.expect(201);

			const [createdLinkId] = await db
				.insert(links)
				.values({ userId: testUserId, folderId: childB2.body.id, url: 'http://...' })
				.returning();

			await request(app.getHttpServer())
				.delete(`/folders/${parentId}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const folderIds = [
				parentId,
				childA.body.id,
				childA1.body.id,
				childA2.body.id,
				childB.body.id,
				childB1.body.id,
				childB2.body.id,
			];

			const deletedFolders = await db.select().from(folders).where(inArray(folders.id, folderIds));
			const [deletedLink] = await db.select().from(links).where(eq(links.id, createdLinkId.id));

			expect(deletedFolders.every((folder) => folder.deletedAt !== null)).toBe(true);
			expect(deletedLink.deletedAt).not.toBeNull();
		});

		test('남의 폴더거나 존재하지 않는 폴더면 404 오류를 반환한다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '...', nickname: '...' }).returning();
			const jwt = app.get(JwtService);
			const otherUserToken = await jwt.signAsync({ sub: otherUser.id });

			const otherUserFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherUserToken}`)
				.send({ name: '다른 유저 폴더' })
				.expect(201);

			const otherUserFolderId = otherUserFolder.body.id;

			await request(app.getHttpServer())
				.delete(`/folders/${otherUserFolderId}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);

			const randomFolderId = crypto.randomUUID();

			await request(app.getHttpServer())
				.delete(`/folders/${randomFolderId}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);
		});

		test('이미 소프트 삭제된 하위 폴더는 deletedAt이 다시 갱신되지 않는다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '부모' })
				.expect(201);

			const child = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '자식', parentFolderId: parent.body.id })
				.expect(201);

			const originalDeletedAt = new Date('2020-01-01T00:00:00Z');
			await db.update(folders).set({ deletedAt: originalDeletedAt }).where(eq(folders.id, child.body.id));

			await request(app.getHttpServer())
				.delete(`/folders/${parent.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const [deletedChild] = await db.select().from(folders).where(eq(folders.id, child.body.id));

			expect(deletedChild.deletedAt).toEqual(originalDeletedAt);
		});
	});
});
