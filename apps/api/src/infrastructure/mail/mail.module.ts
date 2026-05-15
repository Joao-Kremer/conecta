import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IEmailSender } from '../../modules/auth/application/ports/email-sender.port';
import { type Env } from '../config/env.schema';

import { NodemailerAdapter } from './adapters/nodemailer.adapter';
import { ResendAdapter } from './adapters/resend.adapter';

@Module({})
export class MailModule {
  static forRoot(): DynamicModule {
    return {
      module: MailModule,
      providers: [
        {
          provide: IEmailSender,
          useFactory: (config: ConfigService<Env, true>) => {
            const apiKey = config.get('RESEND_API_KEY', { infer: true });
            const nodeEnv = config.get('NODE_ENV', { infer: true });
            if (apiKey && nodeEnv !== 'development') {
              return new ResendAdapter(config);
            }
            return new NodemailerAdapter(config);
          },
          inject: [ConfigService],
        },
      ],
      exports: [IEmailSender],
    };
  }
}
