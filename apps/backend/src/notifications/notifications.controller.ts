import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Patch,
	Put,
	Query,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { JwtPayload } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotGuestGuard } from '../auth/guards/not-guest.guard.js';
import { frontendUrl } from '../common/frontend-url.js';

import { NotificationsService } from './notifications.service.js';

const KAKAO_STATE_COOKIE = 'kakao_notify_state';
const SETTINGS_PATH = '/settings';
const ONBOARDING_BOT_PATH = '/home?onboarding=bot';

@Controller('notifications')
export class NotificationsController {
	constructor(
		private readonly notificationsService: NotificationsService,
		private readonly jwt: JwtService,
	) {}

	@Get('settings')
	@UseGuards(JwtAuthGuard)
	async getSettings(@Req() req: Request) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.notificationsService.getSettings(userId);
	}

	@Patch('settings')
	@UseGuards(JwtAuthGuard, NotGuestGuard)
	async updateSettings(@Req() req: Request, @Body('notificationMethod') notificationMethod: unknown) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.notificationsService.updateNotificationMethod(userId, notificationMethod);
	}

	@Put('push/subscription')
	@HttpCode(204)
	@UseGuards(JwtAuthGuard, NotGuestGuard)
	async savePushSubscription(@Req() req: Request, @Body() subscription: unknown) {
		const { sub: userId } = req.user as JwtPayload;

		await this.notificationsService.savePushSubscription(userId, subscription);
	}

	@Delete('push/subscription')
	@HttpCode(204)
	@UseGuards(JwtAuthGuard)
	async deletePushSubscription(@Req() req: Request, @Body('endpoint') endpoint: unknown) {
		const { sub: userId } = req.user as JwtPayload;

		await this.notificationsService.deletePushSubscription(userId, endpoint);
	}

	@Get('kakao/connect')
	@UseGuards(JwtAuthGuard, NotGuestGuard)
	async connectKakao(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
		@Query('from') from: string | undefined,
	) {
		const { sub: userId } = req.user as JwtPayload;
		const nonce = randomUUID();
		const stateToken = await this.jwt.signAsync(
			{ sub: userId, nonce, onboarding: from === 'onboarding' },
			{ expiresIn: '10m' },
		);

		res.cookie(KAKAO_STATE_COOKIE, stateToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 10 * 60 * 1000,
		});

		const params = new URLSearchParams({
			client_id: process.env.KAKAO_CLIENT_ID ?? '',
			redirect_uri: process.env.KAKAO_NOTIFY_CALLBACK_URL ?? '',
			response_type: 'code',
			scope: 'talk_message',
			state: nonce,
		});

		return { url: `https://kauth.kakao.com/oauth/authorize?${params}` };
	}

	@Get('kakao/callback')
	async kakaoCallback(
		@Req() req: Request,
		@Res() res: Response,
		@Query('code') code: string | undefined,
		@Query('state') state: string | undefined,
	) {
		const stateToken: string | undefined = req.cookies?.[KAKAO_STATE_COOKIE];
		res.clearCookie(KAKAO_STATE_COOKIE);

		const payload = stateToken
			? await this.jwt.verifyAsync<{ sub: string; nonce: string; onboarding?: boolean }>(stateToken).catch(() => null)
			: null;

		if (!payload || payload.nonce !== state) {
			throw new BadRequestException('Invalid state');
		}

		// 온보딩에서 시작했으면 결과와 상관없이 홈으로 돌아가 봇 연동 단계를 이어간다
		const redirectTo = (result: 'connected' | 'cancelled' | 'failed') =>
			res.redirect(frontendUrl(payload.onboarding ? ONBOARDING_BOT_PATH : `${SETTINGS_PATH}?kakao=${result}`));

		if (!code) {
			return redirectTo('cancelled');
		}

		try {
			const connected = await this.notificationsService.connectKakao(payload.sub, code);
			return redirectTo(connected ? 'connected' : 'cancelled');
		} catch {
			return redirectTo('failed');
		}
	}
}
