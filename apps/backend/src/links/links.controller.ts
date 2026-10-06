import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { JwtPayload } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import { LinksService } from './links.service.js';

@Controller('links')
export class LinksController {
	constructor(private readonly linksService: LinksService) {}

	@Post()
	@UseGuards(JwtAuthGuard)
	async createLink(
		@Req() req: Request,
		@Body() { url, folderId, savedReason }: { url: string; folderId: string; savedReason?: string },
	) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.linksService.createLink({ userId, url, folderId, savedReason });
	}
}
