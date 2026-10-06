import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';

@Module({
	imports: [AuthModule],
	controllers: [LinksController],
	providers: [LinksService],
})
export class LinksModule {}
