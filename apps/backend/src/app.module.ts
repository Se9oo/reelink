import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DrizzleModule } from './db/drizzle.module.js';

@Module({
	imports: [DrizzleModule, AuthModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
