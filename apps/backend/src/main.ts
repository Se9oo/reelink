import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

process.loadEnvFile(existsSync('.env.local') ? '.env.local' : '.env');

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	// Express는 기본적으로 Cookie 헤더를 파싱 안 함 — 이게 없으면 req.cookies가 항상 undefined.
	app.use(cookieParser());
	// 로컬 개발에선 프론트(3000)와 백엔드(8080)가 다른 포트라 fetch에 쿠키를 실으려면 CORS 허용이 필요함.
	app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true });
	await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
