import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { RemindersService } from './reminders.service.js';

@Module({
	imports: [AuthModule],
	controllers: [NotificationsController],
	providers: [NotificationsService, RemindersService],
})
export class NotificationsModule {}
