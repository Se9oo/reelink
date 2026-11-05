import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { eq } from 'drizzle-orm';
import request from 'supertest';

import { type DrizzleDb } from '../src/db/drizzle.module.js';
import { kakaoBotLinks, links, users } from '../src/db/schema.js';
import { REDIS, type RedisClient } from '../src/redis/redis.module.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

vi.mock('../src/links/fetch-og-tags.js', () => ({
	fetchOgTags: vi.fn(async () => ({ title: null, thumbnailUrl: null })),
}));

const SECRET = 'test-webhook-secret';

describe('KakaoBot (e2e)', () => {
	let context: E2ETestContext;
	let app: INestApplication;
	let db: DrizzleDb;
	let redis: RedisClient;
	const createdUserIds: string[] = [];

	beforeAll(async () => {
		process.env.KAKAO_WEBHOOK_SECRET = SECRET;
		context = await setupE2EApp('kakao-bot-e2e@test.com', '봇테스트');
		({ app, db } = context);
		redis = app.get<RedisClient>(REDIS);
	});

	afterAll(async () => {
		for (const id of createdUserIds) {
			await db.delete(users).where(eq(users.id, id));
		}
		await teardownE2EApp(context);
	});

	async function createUser({ isGuest = false } = {}) {
		const [user] = await db.insert(users).values({ email: '', nickname: '봇', isGuest }).returning();
		createdUserIds.push(user.id);
		const accessToken = await app.get(JwtService).signAsync({ sub: user.id });
		return { id: user.id, cookie: `access_token=${accessToken}` };
	}

	async function issueCode(cookie: string) {
		const res = await request(app.getHttpServer())
			.post('/notifications/kakao-bot/link-code')
			.set('Cookie', cookie)
			.expect(201);
		return res.body as { code: string; expiresAt: string };
	}

	async function send(botUserKey: string, utterance: string) {
		const res = await request(app.getHttpServer())
			.post('/webhook/kakao')
			.set('x-webhook-secret', SECRET)
			.send({ userRequest: { utterance, user: { id: botUserKey } } })
			.expect(200);
		return res.body.template.outputs[0].simpleText.text as string;
	}

	async function linkStatus(cookie: string) {
		const res = await request(app.getHttpServer())
			.get('/notifications/kakao-bot/link-status')
			.set('Cookie', cookie)
			.expect(200);
		return res.body as { linked: boolean; linkedAt: string | null };
	}

	async function linkedUser() {
		const user = await createUser();
		const botUserKey = crypto.randomUUID();
		const { code } = await issueCode(user.cookie);
		await send(botUserKey, code);
		return { ...user, botUserKey };
	}

	function savedLinks(userId: string) {
		return db.select().from(links).where(eq(links.userId, userId));
	}

	describe('코드 발급', () => {
		test('6자리 코드를 발급하고 Redis에 5분 동안 사용자 id로 저장한다', async () => {
			const user = await createUser();

			const { code, expiresAt } = await issueCode(user.cookie);

			expect(code).toMatch(/^\d{6}$/);
			expect(await redis.get(`botcode:${code}`)).toBe(user.id);
			expect(await redis.ttl(`botcode:${code}`)).toBeGreaterThan(290);
			expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now() + 290_000);
		});

		test('게스트는 403', async () => {
			const guest = await createUser({ isGuest: true });

			await request(app.getHttpServer())
				.post('/notifications/kakao-bot/link-code')
				.set('Cookie', guest.cookie)
				.expect(403);
		});
	});

	describe('연동', () => {
		test('미연동 채팅방이 코드를 보내면 연동되고, 같은 코드는 다시 쓸 수 없다', async () => {
			const user = await createUser();
			const botUserKey = crypto.randomUUID();
			expect(await linkStatus(user.cookie)).toEqual({ linked: false, linkedAt: null });
			const { code } = await issueCode(user.cookie);

			expect(await send(botUserKey, code)).toBe('연동됐어요! 이제 링크를 보내면 저장해 드려요');

			const status = await linkStatus(user.cookie);
			expect(status.linked).toBe(true);
			expect(status.linkedAt).not.toBeNull();
			expect(await redis.get(`botcode:${code}`)).toBeNull();
			expect(await send(crypto.randomUUID(), code)).toContain('코드가 맞지 않아요');
		});

		test('코드 앞뒤 공백·줄바꿈이 있어도 코드로 인식한다', async () => {
			const user = await createUser();
			const { code } = await issueCode(user.cookie);

			expect(await send(crypto.randomUUID(), ` ${code}\n`)).toBe('연동됐어요! 이제 링크를 보내면 저장해 드려요');
		});

		test('계정 A에 연동된 채팅방이 계정 B의 코드를 보내면 B로 옮겨진다', async () => {
			const a = await linkedUser();
			const b = await createUser();
			const { code } = await issueCode(b.cookie);

			expect(await send(a.botUserKey, code)).toBe('연동됐어요! 이제 링크를 보내면 저장해 드려요');

			expect((await linkStatus(a.cookie)).linked).toBe(false);
			expect((await linkStatus(b.cookie)).linked).toBe(true);
		});

		test('같은 사용자가 새 채팅방으로 연동하면 채팅방이 바뀌고 연동 시각이 갱신된다', async () => {
			const user = await linkedUser();
			const before = await linkStatus(user.cookie);
			const newKey = crypto.randomUUID();
			const { code } = await issueCode(user.cookie);

			await send(newKey, code);

			const rows = await db.select().from(kakaoBotLinks).where(eq(kakaoBotLinks.userId, user.id));
			expect(rows).toHaveLength(1);
			expect(rows[0].botUserKey).toBe(newKey);
			expect(new Date((await linkStatus(user.cookie)).linkedAt!).getTime()).toBeGreaterThan(
				new Date(before.linkedAt!).getTime(),
			);
		});

		test('틀린 코드는 남은 시도를 알려주고, 5번 틀리면 맞는 코드도 잠금 안내만 준다', async () => {
			const user = await createUser();
			const botUserKey = crypto.randomUUID();

			expect(await send(botUserKey, '000000')).toBe(
				'코드가 맞지 않아요. 설정 > 카카오톡 봇 연동에서 받은 6자리 코드를 확인해 주세요. 코드는 발급 후 5분 동안만 쓸 수 있어요. (남은 시도 4번)',
			);
			for (let i = 0; i < 3; i++) {
				await send(botUserKey, '000000');
			}
			expect(await send(botUserKey, '000000')).toBe(
				'코드를 여러 번 잘못 입력해서 잠시 연동을 막아뒀어요. 10분 뒤에 설정에서 새 코드를 받아 다시 보내주세요.',
			);

			const { code } = await issueCode(user.cookie);
			expect(await send(botUserKey, code)).toContain('잠시 연동을 막아뒀어요');
			expect((await linkStatus(user.cookie)).linked).toBe(false);
		});
	});

	describe('링크 저장', () => {
		test('연동된 채팅방이 공유 문구를 보내면 URL만 저장한다', async () => {
			const user = await linkedUser();

			expect(await send(user.botUserKey, '[네이버 뉴스] 제목 https://a.com')).toBe('저장했어요 ✅');

			const saved = await savedLinks(user.id);
			expect(saved.map((link) => link.url)).toEqual(['https://a.com']);
		});

		test('URL이 여러 개면 모두 저장한다', async () => {
			const user = await linkedUser();

			expect(await send(user.botUserKey, 'https://a.com https://b.com')).toBe('링크 2개를 저장했어요 ✅');
			expect(await savedLinks(user.id)).toHaveLength(2);
		});

		test('URL이 20개를 넘으면 앞 20개만 저장하고 나머지 개수를 알려준다', async () => {
			const user = await linkedUser();
			const urls = Array.from({ length: 23 }, (_, i) => `https://a.com/${i}`);

			expect(await send(user.botUserKey, urls.join(' '))).toBe(
				'링크 20개를 저장했어요 ✅ 한 번에 20개까지만 저장돼서 나머지 3개는 저장하지 못했어요. 나머지 링크만 따로 보내주세요.',
			);
			expect(await savedLinks(user.id)).toHaveLength(20);
		});

		test('연동된 채팅방이 URL 없이 보내면 안내만 한다', async () => {
			const user = await linkedUser();

			expect(await send(user.botUserKey, '안녕')).toBe('링크를 보내주시면 저장해 드려요');
			expect(await savedLinks(user.id)).toHaveLength(0);
		});

		test('미연동 채팅방이 URL을 보내면 저장하지 않고 연동을 안내한다', async () => {
			expect(await send(crypto.randomUUID(), 'https://a.com')).toBe('설정에서 발급한 연동 코드를 먼저 보내주세요');
		});
	});

	describe('웹훅 요청 검증', () => {
		test('시크릿이 없거나 다르면 401', async () => {
			const body = { userRequest: { utterance: 'https://a.com', user: { id: 'x' } } };

			await request(app.getHttpServer()).post('/webhook/kakao').send(body).expect(401);
			await request(app.getHttpServer()).post('/webhook/kakao').set('x-webhook-secret', 'wrong').send(body).expect(401);
		});

		test('userRequest가 없으면 400', async () => {
			await request(app.getHttpServer()).post('/webhook/kakao').set('x-webhook-secret', SECRET).send({}).expect(400);
		});
	});
});
