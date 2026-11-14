import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService, ENV_CONFIG } from './profiles.service.js';
import { loadEnv } from '../config/env.config.js';

@Module({
  controllers: [ProfilesController],
  providers: [ProfilesService, { provide: ENV_CONFIG, useFactory: loadEnv }],
})
export class ProfilesModule {}
