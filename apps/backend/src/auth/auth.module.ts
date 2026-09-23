import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GithubStrategy } from './strategies/github.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { KakaoStrategy } from './strategies/kakao.strategy.js';

@Module({
	imports: [
		// session: false — 로그인 상태를 Passport의 세션이 아니라 우리 JWT 쿠키로 관리하므로 끕니다.
		PassportModule.register({ session: false }),
		JwtModule.register({
			secret: process.env.JWT_SECRET,
			// JWT_EXPIRES_IN은 .env에서만 오는 값이라 포맷은 우리가 보장 — 타입만 맞춰줌
			signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as `${number}m` },
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, KakaoStrategy, GoogleStrategy, GithubStrategy, JwtAuthGuard],
	// JwtAuthGuard를 다른 모듈(폴더/링크 등)에서도 라우트 보호에 쓸 수 있게 내보냅니다.
	exports: [JwtAuthGuard],
})
export class AuthModule {}
