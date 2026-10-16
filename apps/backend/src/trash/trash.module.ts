import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FoldersModule } from '../folders/folders.module.js';

import { TrashController } from './trash.controller.js';
import { TrashService } from './trash.service.js';

@Module({
	imports: [AuthModule, FoldersModule],
	controllers: [TrashController],
	providers: [TrashService],
})
export class TrashModule {}
