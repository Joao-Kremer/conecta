import { Module } from '@nestjs/common';

import { ConfigModule } from './infrastructure/config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './infrastructure/health/health.module';
import { LoggerModule } from './infrastructure/logger/logger.module';

@Module({
  imports: [ConfigModule, LoggerModule, DatabaseModule, HealthModule],
})
export class AppModule {}
