import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DrizzleModule } from './db/drizzle.module.js';
import { FoldersModule } from './folders/folders.module.js';
import { LinksModule } from './links/links.module.js';

@Module({
	imports: [DrizzleModule, AuthModule, FoldersModule, LinksModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
