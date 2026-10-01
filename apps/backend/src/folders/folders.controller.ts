import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FoldersService } from './folders.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { JwtPayload } from '../auth/auth.types.js';

@Controller('folders')
export class FoldersController {
	constructor(private readonly foldersService: FoldersService) {}

	@Post()
	@UseGuards(JwtAuthGuard)
	async postFolder(
		@Req() req: Request,
		@Body() { name, parentFolderId }: { name: string; parentFolderId?: string | null },
	) {
		const { sub: userId } = req.user as JwtPayload;
		return await this.foldersService.createFolder({ userId, name, parentFolderId });
	}
}
