import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { and, eq, inArray } from 'drizzle-orm';
import request from 'supertest';

import { DrizzleDb } from '../src/db/drizzle.module.js';
import { folders, links, users } from '../src/db/schema.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

describe('TrashController (e2e)', () => {
	let context: E2ETestContext;
	let app: INestApplication;
	let db: DrizzleDb;
	let accessToken: string;
	let testUserId: string;

	beforeAll(async () => {
		context = await setupE2EApp('trash-e2e@test.com', '휴지통테스트');
		({ app, db, accessToken, testUserId } = context);
	});

	afterAll(async () => {
		await teardownE2EApp(context);
	});

	describe('Get /trash', () => {
		test('삭제된 항목이 없으면 폴더·링크 모두 빈 배열을 반환한다.', async () => {
			const [emptyUser] = await db.insert(users).values({ email: '...', nickname: '...' }).returning();
			const jwt = app.get(JwtService);
			const emptyUserToken = await jwt.signAsync({ sub: emptyUser.id });

			const res = await request(app.getHttpServer())
				.get('/trash')
				.set('Cookie', `access_token=${emptyUserToken}`)
				.expect(200);

			expect(res.body).toEqual({ folders: [], links: [] });

			await db.delete(users).where(eq(users.id, emptyUser.id));
		});

		test('독립적으로 삭제된 폴더·링크는 parentName/parentFolderName이 null이다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '레시피' })
				.expect(201);

			const linkFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '링크 폴더' })
				.expect(201);

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: linkFolder.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/links/${link.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);
			await request(app.getHttpServer())
				.delete(`/folders/${folder.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const res = await request(app.getHttpServer())
				.get('/trash')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			const trashedFolder = res.body.folders.find((f: { id: string }) => f.id === folder.body.id);
			const trashedLink = res.body.links.find((l: { id: string }) => l.id === link.body.id);

			expect(trashedFolder).toMatchObject({ parentName: null });
			expect(trashedLink).toMatchObject({ parentFolderName: null });
		});

		test('폴더 cascade 삭제로 같이 삭제된 하위 폴더·링크는 parentName/parentFolderName이 채워진다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '레시피' })
				.expect(201);

			const child = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '한식', parentFolderId: parent.body.id })
				.expect(201);

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: child.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${parent.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const res = await request(app.getHttpServer())
				.get('/trash')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			const trashedChild = res.body.folders.find((f: { id: string }) => f.id === child.body.id);
			const trashedLink = res.body.links.find((l: { id: string }) => l.id === link.body.id);

			expect(trashedChild).toMatchObject({ parentName: '레시피' });
			expect(trashedLink).toMatchObject({ parentFolderName: '한식' });
		});

		test('소프트 삭제되지 않은 폴더·링크는 포함되지 않는다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '안 지운 폴더' })
				.expect(201);

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: folder.body.id })
				.expect(201);

			const res = await request(app.getHttpServer())
				.get('/trash')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			expect(res.body.folders.map((f: { id: string }) => f.id)).not.toContain(folder.body.id);
			expect(res.body.links.map((l: { id: string }) => l.id)).not.toContain(link.body.id);
		});

		test('다른 사용자의 삭제 항목은 포함되지 않는다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '다른이메일', nickname: '다른유저' }).returning();
			const jwt = app.get(JwtService);
			const otherAccessToken = await jwt.signAsync({ sub: otherUser.id });

			const otherFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherAccessToken}`)
				.send({ name: '남의 폴더' })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${otherFolder.body.id}`)
				.set('Cookie', `access_token=${otherAccessToken}`)
				.expect(204);

			const res = await request(app.getHttpServer())
				.get('/trash')
				.set('Cookie', `access_token=${accessToken}`)
				.expect(200);

			expect(res.body.folders.map((f: { id: string }) => f.id)).not.toContain(otherFolder.body.id);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			await request(app.getHttpServer()).get('/trash').expect(401);
		});
	});

	describe('Post /trash/:type/:id/restore', () => {
		test('폴더 복구: 부모가 살아있으면 그 부모 밑으로, deletedAt이 null로 복구된다.', async () => {
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

			await request(app.getHttpServer())
				.delete(`/folders/${child.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const res = await request(app.getHttpServer())
				.post(`/trash/folder/${child.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(201);

			expect(res.body).toMatchObject({ parentFolderId: parent.body.id, deletedAt: null });
		});

		test('폴더 복구: 부모가 삭제된 상태면 최상위로 복구되고 sortOrder가 재계산된다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '같이 지워질 부모' })
				.expect(201);

			const child = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '자식', parentFolderId: parent.body.id })
				.expect(201);

			const existingRoot = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '기존 최상위 폴더' })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${parent.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const res = await request(app.getHttpServer())
				.post(`/trash/folder/${child.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(201);

			expect(res.body.parentFolderId).toBeNull();
			expect(res.body.deletedAt).toBeNull();
			expect(res.body.sortOrder).toEqual(existingRoot.body.sortOrder + 1);
		});

		test('링크 복구: 폴더가 살아있으면 그 폴더 그대로 복구된다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '폴더' })
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

			const res = await request(app.getHttpServer())
				.post(`/trash/link/${link.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(201);

			expect(res.body).toMatchObject({ folderId: folder.body.id, deletedAt: null });
		});

		test('링크 복구: 폴더가 삭제된 상태면 미분류 시스템 폴더로 복구된다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '같이 지워질 폴더' })
				.expect(201);

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: folder.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${folder.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const res = await request(app.getHttpServer())
				.post(`/trash/link/${link.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(201);

			expect(res.body.deletedAt).toBeNull();
			expect(res.body.folderId).not.toEqual(folder.body.id);

			const [uncategorized] = await db.select().from(folders).where(eq(folders.id, res.body.folderId));

			expect(uncategorized).toMatchObject({ userId: testUserId, isSystem: true, name: '미분류' });
		});

		test('링크 복구: 미분류 폴더가 이미 있으면 재사용하고 중복 생성하지 않는다.', async () => {
			const folderA = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '폴더A' })
				.expect(201);
			const folderB = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '폴더B' })
				.expect(201);

			const linkA = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: folderA.body.id })
				.expect(201);
			const linkB = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://daum.net', folderId: folderB.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${folderA.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);
			await request(app.getHttpServer())
				.delete(`/folders/${folderB.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const resA = await request(app.getHttpServer())
				.post(`/trash/link/${linkA.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(201);
			const resB = await request(app.getHttpServer())
				.post(`/trash/link/${linkB.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(201);

			expect(resA.body.folderId).toEqual(resB.body.folderId);

			const uncategorizedFolders = await db
				.select()
				.from(folders)
				.where(and(eq(folders.userId, testUserId), eq(folders.isSystem, true), eq(folders.name, '미분류')));

			expect(uncategorizedFolders).toHaveLength(1);
		});

		test('삭제되지 않은 항목을 복구 시도하면 404 오류를 반환한다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '안 지운 폴더' })
				.expect(201);

			await request(app.getHttpServer())
				.post(`/trash/folder/${folder.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);
		});

		test('존재하지 않거나 남의 항목이면 404 오류를 반환한다.', async () => {
			const randomId = crypto.randomUUID();

			await request(app.getHttpServer())
				.post(`/trash/folder/${randomId}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);

			const [otherUser] = await db.insert(users).values({ email: '다른이메일2', nickname: '다른유저2' }).returning();
			const jwt = app.get(JwtService);
			const otherAccessToken = await jwt.signAsync({ sub: otherUser.id });

			const otherFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherAccessToken}`)
				.send({ name: '남의 폴더' })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${otherFolder.body.id}`)
				.set('Cookie', `access_token=${otherAccessToken}`)
				.expect(204);

			await request(app.getHttpServer())
				.post(`/trash/folder/${otherFolder.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('폴더를 복구하면 같이 삭제된 하위 폴더·링크도 함께 복구된다.', async () => {
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

			const grandchildLink = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: child.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${parent.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			await request(app.getHttpServer())
				.post(`/trash/folder/${parent.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(201);

			const [restoredChild] = await db.select().from(folders).where(eq(folders.id, child.body.id));
			const [restoredLink] = await db.select().from(links).where(eq(links.id, grandchildLink.body.id));

			expect(restoredChild).toMatchObject({ deletedAt: null, parentFolderId: parent.body.id });
			expect(restoredLink).toMatchObject({ deletedAt: null, folderId: child.body.id });
		});

		test('부모보다 먼저 따로 삭제된 하위 항목은 부모를 복구해도 휴지통에 남는다.', async () => {
			const parent = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '부모' })
				.expect(201);

			const earlierDeletedChild = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '먼저 지운 자식', parentFolderId: parent.body.id })
				.expect(201);

			const earlierDeletedLink = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: parent.body.id })
				.expect(201);

			const earlier = new Date('2020-01-01T00:00:00Z');
			await db.update(folders).set({ deletedAt: earlier }).where(eq(folders.id, earlierDeletedChild.body.id));
			await db.update(links).set({ deletedAt: earlier }).where(eq(links.id, earlierDeletedLink.body.id));

			await request(app.getHttpServer())
				.delete(`/folders/${parent.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			await request(app.getHttpServer())
				.post(`/trash/folder/${parent.body.id}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(201);

			const [child] = await db.select().from(folders).where(eq(folders.id, earlierDeletedChild.body.id));
			const [link] = await db.select().from(links).where(eq(links.id, earlierDeletedLink.body.id));

			expect(child.deletedAt).not.toBeNull();
			expect(link.deletedAt).not.toBeNull();
		});

		test('type이 folder/link가 아니면 400 오류를 반환한다.', async () => {
			const randomId = crypto.randomUUID();

			await request(app.getHttpServer())
				.post(`/trash/invalid-type/${randomId}/restore`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(400);
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			const randomId = crypto.randomUUID();

			await request(app.getHttpServer()).post(`/trash/folder/${randomId}/restore`).expect(401);
		});
	});

	describe('Delete /trash/:type/:id', () => {
		test('폴더를 영구 삭제하면 하위 폴더·링크까지 DB에서 사라진다.', async () => {
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

			const link = await request(app.getHttpServer())
				.post('/links')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ url: 'https://naver.com', folderId: child.body.id })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${parent.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			await request(app.getHttpServer())
				.delete(`/trash/folder/${parent.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const remainingFolders = await db
				.select()
				.from(folders)
				.where(inArray(folders.id, [parent.body.id, child.body.id]));
			const remainingLinks = await db.select().from(links).where(eq(links.id, link.body.id));

			expect(remainingFolders).toHaveLength(0);
			expect(remainingLinks).toHaveLength(0);
		});

		test('링크를 영구 삭제하면 DB에서 사라진다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '폴더' })
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

			await request(app.getHttpServer())
				.delete(`/trash/link/${link.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(204);

			const remaining = await db.select().from(links).where(eq(links.id, link.body.id));

			expect(remaining).toHaveLength(0);
		});

		test('휴지통에 없는(삭제되지 않은) 항목이면 404 오류를 반환하고 지우지 않는다.', async () => {
			const folder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${accessToken}`)
				.send({ name: '살아있는 폴더' })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/trash/folder/${folder.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);

			const [stillThere] = await db.select().from(folders).where(eq(folders.id, folder.body.id));

			expect(stillThere).toBeDefined();
		});

		test('남의 항목이거나 존재하지 않으면 404 오류를 반환한다.', async () => {
			const [otherUser] = await db.insert(users).values({ email: '다른이메일3', nickname: '다른유저3' }).returning();
			const jwt = app.get(JwtService);
			const otherAccessToken = await jwt.signAsync({ sub: otherUser.id });

			const otherFolder = await request(app.getHttpServer())
				.post('/folders')
				.set('Cookie', `access_token=${otherAccessToken}`)
				.send({ name: '남의 폴더' })
				.expect(201);

			await request(app.getHttpServer())
				.delete(`/folders/${otherFolder.body.id}`)
				.set('Cookie', `access_token=${otherAccessToken}`)
				.expect(204);

			await request(app.getHttpServer())
				.delete(`/trash/folder/${otherFolder.body.id}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);

			await request(app.getHttpServer())
				.delete(`/trash/link/${crypto.randomUUID()}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(404);

			await db.delete(users).where(eq(users.id, otherUser.id));
		});

		test('type이 folder/link가 아니면 400 오류를 반환한다.', async () => {
			await request(app.getHttpServer())
				.delete(`/trash/invalid-type/${crypto.randomUUID()}`)
				.set('Cookie', `access_token=${accessToken}`)
				.expect(400);
		});

		test('인증 쿠키가 없으면 401 오류를 반환한다.', async () => {
			await request(app.getHttpServer()).delete(`/trash/folder/${crypto.randomUUID()}`).expect(401);
		});
	});
});
