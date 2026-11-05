import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DrizzleModule } from './db/drizzle.module.js';
import { FoldersModule } from './folders/folders.module.js';
import { KakaoBotModule } from './kakao-bot/kakao-bot.module.js';
import { LinksModule } from './links/links.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { RedisModule } from './redis/redis.module.js';
import { TrashModule } from './trash/trash.module.js';

@Module({
	imports: [
		ScheduleModule.forRoot(),
		DrizzleModule,
		RedisModule,
		AuthModule,
		FoldersModule,
		LinksModule,
		TrashModule,
		NotificationsModule,
		KakaoBotModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
