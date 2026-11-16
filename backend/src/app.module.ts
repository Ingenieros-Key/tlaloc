import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { PlotsModule } from './plots/plots.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    ProfilesModule,
    PlotsModule,
  ],
})
export class AppModule {}
