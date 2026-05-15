import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { type Env } from '../config/env.schema';

import { dataSourceOptions } from './data-source';
import { TenantSubscriber } from './subscribers/tenant.subscriber';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...dataSourceOptions,
        url: config.get('DATABASE_URL', { infer: true }),
        subscribers: [TenantSubscriber],
      }),
    }),
  ],
})
export class DatabaseModule {}
