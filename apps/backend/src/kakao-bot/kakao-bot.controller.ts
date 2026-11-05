import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Headers,
	HttpCode,
	Post,
	Req,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';

import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

import { type JwtPayload } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotGuestGuard } from '../auth/guards/not-guest.guard.js';

import { KakaoBotService } from './kakao-bot.service.js';
import { type KakaoSkillRequest } from './kakao-bot.types.js';

/**
 * 오픈빌더가 스킬 요청 헤더에 실어 보내는 시크릿이 서버 설정값과 같은지 확인한다.
 * env는 import 이후에 로드되므로 요청 시점에 읽는다.
 * @param secret string | undefined
 * @returns boolean 설정값이 없으면 항상 false
 */
function isValidWebhookSecret(secret: string | undefined): boolean {
	const expected = process.env.KAKAO_WEBHOOK_SECRET;

	if (!expected || !secret) {
		return false;
	}

	const a = Buffer.from(secret);
	const b = Buffer.from(expected);

	return a.length === b.length && timingSafeEqual(a, b);
}

@Controller()
export class KakaoBotController {
	constructor(private readonly kakaoBotService: KakaoBotService) {}

	@Post('notifications/kakao-bot/link-code')
	@UseGuards(JwtAuthGuard, NotGuestGuard)
	async issueLinkCode(@Req() req: Request) {
		const { sub } = req.user as JwtPayload;

		return await this.kakaoBotService.issueLinkCode(sub);
	}

	@Get('notifications/kakao-bot/link-status')
	@UseGuards(JwtAuthGuard)
	async getLinkStatus(@Req() req: Request) {
		const { sub } = req.user as JwtPayload;

		return await this.kakaoBotService.getLinkStatus(sub);
	}

	/** 오픈빌더 스킬 웹훅. 답장은 스킬 응답 v2 simpleText로 보낸다. */
	@Post('webhook/kakao')
	@HttpCode(200)
	async webhook(@Headers('x-webhook-secret') secret: string | undefined, @Body() body: KakaoSkillRequest) {
		if (!isValidWebhookSecret(secret)) {
			throw new UnauthorizedException();
		}

		const botUserKey = body.userRequest?.user?.id;
		const utterance = body.userRequest?.utterance;

		if (typeof botUserKey !== 'string' || typeof utterance !== 'string') {
			throw new BadRequestException();
		}

		const text = await this.kakaoBotService.handleMessage(botUserKey, utterance);

		return { version: '2.0', template: { outputs: [{ simpleText: { text } }] } };
	}
}
