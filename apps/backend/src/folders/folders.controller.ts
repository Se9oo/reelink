import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FoldersService } from './folders.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { JwtPayload } from '../auth/auth.types.js';

@Controller('folders')
export class FoldersController {
	constructor(private readonly foldersService: FoldersService) {}

	@Post()
	@UseGuards(JwtAuthGuard)
	async createFolder(
		@Req() req: Request,
		@Body() { name, parentFolderId }: { name: string; parentFolderId?: string | null },
	) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.foldersService.createFolder({ userId, name, parentFolderId });
	}

	@Get()
	@UseGuards(JwtAuthGuard)
	async getMyFolders(@Req() req: Request) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.foldersService.getMyFolders({ userId });
	}

	@Patch('reorder')
	@UseGuards(JwtAuthGuard)
	async reorderFolders(@Req() req: Request, @Body() folderIds: string[]) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.foldersService.reorderFolders({ userId, folderIds });
	}

	@Patch(':id')
	@UseGuards(JwtAuthGuard)
	async updateFolder(
		@Req() req: Request,
		@Param() { id: folderId }: { id: string },
		@Body() { name, parentFolderId }: { name?: string; parentFolderId?: string | null },
	) {
		const { sub: userId } = req.user as JwtPayload;

		return await this.foldersService.updateFolder({ userId, name, parentFolderId, folderId });
	}

	@Delete(':id')
	@HttpCode(204)
	@UseGuards(JwtAuthGuard)
	async deleteFolder(@Req() req: Request, @Param() { id: folderId }: { id: string }) {
		const { sub: userId } = req.user as JwtPayload;

		await this.foldersService.deleteFolder({ userId, folderId });
	}
}
