import { NestFactory } from '@nestjs/core';

import { existsSync } from 'node:fs';

import { AppModule } from '../app.module.js';

import { RemindersService } from './reminders.service.js';

process.loadEnvFile(existsSync('.env.local') ? '.env.local' : '.env');

const app = await NestFactory.createApplicationContext(AppModule);
await app.get(RemindersService).handleDailyReminders();
await app.close();
process.exit(0);
