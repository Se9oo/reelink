import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';

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

	@Get('feed')
	@UseGuards(JwtAuthGuard)
	async getFeed(@Req() req: Request) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.linksService.getFeed({ userId });
	}

	@Get('search')
	@UseGuards(JwtAuthGuard)
	async searchLinks(@Req() req: Request, @Query('q') q?: unknown) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.linksService.searchLinks({ userId, q: typeof q === 'string' ? q : '' });
	}

	@Patch(':id')
	@UseGuards(JwtAuthGuard)
	async updateLink(
		@Req() req: Request,
		@Param('id', ParseUUIDPipe) linkId: string,
		@Body() { title, savedReason }: { title?: unknown; savedReason?: unknown },
	) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.linksService.updateLink({ userId, linkId, title, savedReason });
	}

	@Patch(':id/view')
	@UseGuards(JwtAuthGuard)
	async viewLink(@Req() req: Request, @Param('id', ParseUUIDPipe) linkId: string) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.linksService.viewLink({ userId, linkId });
	}

	@Patch(':id/pin')
	@UseGuards(JwtAuthGuard)
	async pinLink(
		@Req() req: Request,
		@Param('id', ParseUUIDPipe) linkId: string,
		@Body() { pinned }: { pinned?: unknown },
	) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.linksService.pinLink({ userId, linkId, pinned });
	}

	@Patch(':id/folder')
	@UseGuards(JwtAuthGuard)
	async moveLink(
		@Req() req: Request,
		@Param('id', ParseUUIDPipe) linkId: string,
		@Body('folderId', ParseUUIDPipe) folderId: string,
	) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.linksService.moveLink({ userId, linkId, folderId });
	}

	@Delete(':id')
	@HttpCode(204)
	@UseGuards(JwtAuthGuard)
	async deleteLink(@Req() req: Request, @Param() { id: linkId }: { id: string }) {
		const { sub: userId } = req.user as JwtPayload;

		await this.linksService.deleteLink({ userId, linkId });
	}
}
