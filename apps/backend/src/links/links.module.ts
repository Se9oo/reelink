import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FoldersModule } from '../folders/folders.module.js';

import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';

@Module({
	imports: [AuthModule, FoldersModule],
	controllers: [LinksController],
	providers: [LinksService],
	exports: [LinksService],
})
export class LinksModule {}
