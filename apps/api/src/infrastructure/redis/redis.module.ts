import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type Env } from '../config/env.schema';

import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: RedisService,
      useFactory: (config: ConfigService<Env, true>) =>
        new RedisService(config.get('REDIS_URL', { infer: true })),
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
