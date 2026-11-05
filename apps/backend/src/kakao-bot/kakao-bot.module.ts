import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { LinksModule } from '../links/links.module.js';

import { KakaoBotController } from './kakao-bot.controller.js';
import { KakaoBotService } from './kakao-bot.service.js';

@Module({
	imports: [AuthModule, LinksModule],
	controllers: [KakaoBotController],
	providers: [KakaoBotService],
})
export class KakaoBotModule {}
