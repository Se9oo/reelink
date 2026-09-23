import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

process.loadEnvFile(existsSync('.env.local') ? '.env.local' : '.env');

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	// Express는 기본적으로 Cookie 헤더를 파싱 안 함 — 이게 없으면 req.cookies가 항상 undefined.
	app.use(cookieParser());
	await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
