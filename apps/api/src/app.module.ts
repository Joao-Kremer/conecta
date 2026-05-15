import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { ConfigModule } from './infrastructure/config/config.module';
import { CryptoModule } from './infrastructure/crypto/crypto.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './infrastructure/health/health.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { RequestIdMiddleware } from './shared/middlewares/request-id.middleware';

@Module({
  imports: [ConfigModule, LoggerModule, DatabaseModule, HealthModule, CryptoModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
