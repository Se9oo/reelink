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
		// session: false — 로그인 상태를 Passport의 세션이 아니라 JWT 쿠키로 관리함
		PassportModule.register({ session: false }),
		// register()가 아니라 registerAsync() — useFactory는 Nest가 앱을 실제로
		// 부팅할 때(= main.ts의 process.loadEnvFile 이후) 호출되므로, env가 로드되기도
		// 전에 process.env를 읽어버리는(import 순서 문제) 걸 피할 수 있음
		JwtModule.registerAsync({
			useFactory: () => ({
				secret: process.env.JWT_SECRET,
				signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as `${number}m` },
			}),
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, KakaoStrategy, GoogleStrategy, GithubStrategy, JwtAuthGuard],
	// JwtAuthGuard를 다른 모듈(폴더/링크 등)에서도 라우트 보호에 쓸 수 있게 내보냅니다.
	// JwtAuthGuard 내부가 JwtService를 필요로 해서, JwtModule도 같이 내보내야 그 모듈들의
	// DI 컨테이너에서 JwtService를 찾을 수 있음.
	exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
