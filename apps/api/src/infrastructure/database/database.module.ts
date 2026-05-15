import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { type Env } from '../config/env.schema';

import { dataSourceOptions } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...dataSourceOptions,
        url: config.get('DATABASE_URL', { infer: true }),
      }),
    }),
  ],
})
export class DatabaseModule {}
