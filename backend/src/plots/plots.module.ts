import { Module } from '@nestjs/common';
import { PlotsController } from './plots.controller.js';
import { PlotsService, ENV_CONFIG } from './plots.service.js';
import { loadEnv } from '../config/env.config.js';

@Module({
  controllers: [PlotsController],
  providers: [PlotsService, { provide: ENV_CONFIG, useFactory: loadEnv }],
})
export class PlotsModule {}
