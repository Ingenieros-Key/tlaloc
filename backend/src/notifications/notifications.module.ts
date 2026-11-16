import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService, ENV_CONFIG } from './notifications.service.js';
import { loadEnv } from '../config/env.config.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: ENV_CONFIG, useFactory: loadEnv },
  ],
})
export class NotificationsModule {}
