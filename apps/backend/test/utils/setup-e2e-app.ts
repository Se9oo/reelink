import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';

import { AppModule } from '../../src/app.module.js';
import { DRIZZLE, type DrizzleDb } from '../../src/db/drizzle.module.js';
import { users } from '../../src/db/schema.js';

export interface E2ETestContext {
	app: INestApplication;
	db: DrizzleDb;
	accessToken: string;
	testUserId: string;
}

/**
 * e2e 테스트용 Nest 앱을 띄우고, 실제 OAuth 로그인 없이 테스트 유저를 직접 insert해서
 * JwtService로 같은 모양의 토큰만 만들어 인증을 통과시킨다.
 * @param email string
 * @param nickname string
 * @returns E2ETestContext
 */
export async function setupE2EApp(email: string, nickname: string): Promise<E2ETestContext> {
	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	const app = moduleFixture.createNestApplication();
	app.use(cookieParser());
	await app.init();

	const db = app.get<DrizzleDb>(DRIZZLE);
	const jwt = app.get(JwtService);

	const [testUser] = await db.insert(users).values({ email, nickname }).returning();
	const testUserId = testUser.id;
	const accessToken = await jwt.signAsync({ sub: testUserId });

	return { app, db, accessToken, testUserId };
}

/**
 * setupE2EApp으로 만든 테스트 유저와 앱을 정리한다.
 * @param context E2ETestContext
 */
export async function teardownE2EApp({ app, db, testUserId }: E2ETestContext): Promise<void> {
	// users를 지우면 각 테이블 FK의 onDelete: 'cascade'로 생성된 하위 데이터(폴더·링크 등)도 같이 정리됨
	await db.delete(users).where(eq(users.id, testUserId));
	await app.close();
}
