import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';

import { Redis } from 'ioredis';

export const REDIS = Symbol('REDIS');

export type RedisClient = Redis;

@Global()
@Module({
	providers: [
		{
			provide: REDIS,
			// useFactory는 앱 부팅 시점(env 로드 이후)에 호출된다
			// 기본값이면 Redis가 죽었을 때 명령이 수십 초 매달려 오픈빌더 5초 타임아웃을 넘긴다
			useFactory: (): RedisClient =>
				new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
					maxRetriesPerRequest: 3,
					commandTimeout: 1000,
				}),
		},
	],
	exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
	constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

	/** 앱이 닫힐 때 연결을 끊는다. 안 끊으면 테스트 러너가 끝나지 않는다. */
	async onApplicationShutdown(): Promise<void> {
		await this.redis.quit();
	}
}
