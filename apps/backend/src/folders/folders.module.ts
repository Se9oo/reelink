import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { FoldersController } from './folders.controller.js';
import { FoldersService } from './folders.service.js';

@Module({
	imports: [AuthModule],
	controllers: [FoldersController],
	providers: [FoldersService],
})
export class FoldersModule {}
