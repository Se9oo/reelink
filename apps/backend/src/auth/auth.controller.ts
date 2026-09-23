import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { type OAuthProfile } from './auth.types.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Get('kakao')
	@UseGuards(AuthGuard('kakao'))
	kakaoLogin() {
		// Passport가 카카오 로그인 페이지로 리다이렉트합니다. 여기 본문은 실행되지 않습니다.
	}

	@Get('kakao/callback')
	@UseGuards(AuthGuard('kakao'))
	async kakaoCallback(@Req() req: Request, @Res() res: Response) {
		await this.handleOAuthCallback(req, res);
	}

	@Get('google')
	@UseGuards(AuthGuard('google'))
	googleLogin() {}

	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	async googleCallback(@Req() req: Request, @Res() res: Response) {
		await this.handleOAuthCallback(req, res);
	}

	@Get('github')
	@UseGuards(AuthGuard('github'))
	githubLogin() {}

	@Get('github/callback')
	@UseGuards(AuthGuard('github'))
	async githubCallback(@Req() req: Request, @Res() res: Response) {
		await this.handleOAuthCallback(req, res);
	}

	@Post('logout')
	async logout(@Req() req: Request, @Res() res: Response) {
		const refreshToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE];
		if (refreshToken) {
			await this.authService.revokeRefreshToken(refreshToken);
		}
		res.clearCookie(ACCESS_TOKEN_COOKIE);
		res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });
		res.sendStatus(204);
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	me(@Req() req: Request) {
		return req.user;
	}

	@Post('refresh')
	async refresh(@Req() req: Request, @Res() res: Response) {
		const refreshToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE];
		if (!refreshToken) {
			throw new UnauthorizedException();
		}
		const tokens = await this.authService.rotateRefreshToken(refreshToken);
		this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
		res.sendStatus(204);
	}

	/** 3개 provider 콜백이 공유하는 뒷단: strategy의 validate() 결과(req.user) → 사용자 조회/생성 → 토큰 발급 → 쿠키 설정 → 프론트로 리다이렉트. */
	private async handleOAuthCallback(req: Request, res: Response) {
		const profile = req.user as OAuthProfile;
		const user = await this.authService.findOrCreateUser(profile);
		const tokens = await this.authService.issueTokens(user.id);
		this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
		res.redirect(process.env.FRONTEND_URL ?? 'http://localhost:3001');
	}

	private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
		res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 15 * 60 * 1000,
			path: '/',
		});
		// refresh 쿠키는 /auth 경로에만 실려가게 제한 — 매 요청마다 브라우저가 이 쿠키를 보낼 필요가 없어서(access token만 있으면 충분)
		res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60 * 1000,
			path: '/auth',
		});
	}
}
