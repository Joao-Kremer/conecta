import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { type Env } from './infrastructure/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const cookieSecret = config.get('COOKIE_SECRET', { infer: true });
  const webUrl = config.get('WEB_URL', { infer: true });
  const port = config.get('PORT', { infer: true });

  app.use(helmet());
  app.use(cookieParser(cookieSecret));
  app.enableCors({ origin: webUrl, credentials: true });

  await app.listen(port);

  app.get(Logger).log(`API listening on http://localhost:${String(port)}`);
}

void bootstrap();
