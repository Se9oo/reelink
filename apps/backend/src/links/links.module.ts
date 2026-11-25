import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FoldersModule } from '../folders/folders.module.js';

import { AutoSortController } from './auto-sort.controller.js';
import { AutoSortService } from './auto-sort.service.js';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';

@Module({
	imports: [AuthModule, FoldersModule],
	controllers: [LinksController, AutoSortController],
	providers: [LinksService, AutoSortService],
	exports: [LinksService],
})
export class LinksModule {}
