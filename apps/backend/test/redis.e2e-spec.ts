import { REDIS, type RedisClient } from '../src/redis/redis.module.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

describe('RedisModule (e2e)', () => {
	let context: E2ETestContext;

	beforeAll(async () => {
		context = await setupE2EApp('redis-e2e@test.com', '레디스테스트');
	});

	afterAll(async () => {
		await teardownE2EApp(context);
	});

	test('주입받은 클라이언트로 값을 쓰고 읽는다', async () => {
		const redis = context.app.get<RedisClient>(REDIS);

		await redis.set('e2e:ping', '1', 'EX', 5);

		expect(await redis.get('e2e:ping')).toBe('1');
	});
});
