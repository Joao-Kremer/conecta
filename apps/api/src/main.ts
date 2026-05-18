import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Swagger is exposed only outside production.
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Conecta API')
      .setDescription('Multi-tenant SaaS for sports schools')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);

  app.get(Logger).log(`API listening on http://localhost:${String(port)}`);
}

void bootstrap();
