import { Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { JwtPayload } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotGuestGuard } from '../auth/guards/not-guest.guard.js';

import { AutoSortService } from './auto-sort.service.js';

@Controller()
export class AutoSortController {
	constructor(private readonly autoSortService: AutoSortService) {}

	@Get('links/auto-sort/quota')
	@UseGuards(JwtAuthGuard, NotGuestGuard)
	async getQuota(@Req() req: Request) {
		const { sub: userId } = req.user as JwtPayload;

		return { remaining: await this.autoSortService.getRemaining(userId) };
	}

	@Post('folders/:id/auto-sort')
	@UseGuards(JwtAuthGuard, NotGuestGuard)
	async suggest(@Req() req: Request, @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) folderId: string) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.autoSortService.suggest({ userId, folderId });
	}
}
