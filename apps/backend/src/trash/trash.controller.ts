import { Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { JwtPayload } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import { TrashService } from './trash.service.js';

@Controller('trash')
export class TrashController {
	constructor(private readonly trashService: TrashService) {}

	@Get()
	@UseGuards(JwtAuthGuard)
	async getTrash(@Req() req: Request) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.trashService.getTrash(userId);
	}

	@Post(':type/:id/restore')
	@UseGuards(JwtAuthGuard)
	async restoreItem(@Req() req: Request, @Param() { type, id }: { type: string; id: string }) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.trashService.restoreItem({ userId, type, id });
	}

	@Delete(':type/:id')
	@HttpCode(204)
	@UseGuards(JwtAuthGuard)
	async deleteItemPermanently(@Req() req: Request, @Param() { type, id }: { type: string; id: string }) {
		const { sub: userId } = req.user as JwtPayload;

		await this.trashService.deleteItemPermanently({ userId, type, id });
	}
}
