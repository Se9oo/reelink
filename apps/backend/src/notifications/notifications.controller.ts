import { BadRequestException, Body, Controller, Get, Patch, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { JwtPayload } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import { NotificationsService } from './notifications.service.js';

const KAKAO_STATE_COOKIE = 'kakao_notify_state';
const SETTINGS_PATH = '/settings';

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
	@UseGuards(JwtAuthGuard)
	async updateSettings(@Req() req: Request, @Body('notificationMethod') notificationMethod: unknown) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.notificationsService.updateNotificationMethod(userId, notificationMethod);
	}

	@Get('kakao/connect')
	@UseGuards(JwtAuthGuard)
	async connectKakao(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const { sub: userId } = req.user as JwtPayload;
		const nonce = randomUUID();
		const stateToken = await this.jwt.signAsync({ sub: userId, nonce }, { expiresIn: '10m' });

		res.cookie(KAKAO_STATE_COOKIE, stateToken, {
			httpOnly: true,
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
			? await this.jwt.verifyAsync<{ sub: string; nonce: string }>(stateToken).catch(() => null)
			: null;

		if (!payload || payload.nonce !== state) {
			throw new BadRequestException('Invalid state');
		}

		const redirectTo = (result: 'connected' | 'cancelled' | 'failed') =>
			res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:3000'}${SETTINGS_PATH}?kakao=${result}`);

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
