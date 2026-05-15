import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Request } from 'express';
import { from, type Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { RedisService } from '../../infrastructure/redis/redis.service';
import { RequestContext } from '../context/request.context';

const IDEMPOTENT_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const TTL_SECONDS = 86_400;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    if (!idempotencyKey || !IDEMPOTENT_METHODS.has(req.method)) {
      return next.handle();
    }

    const ctx = RequestContext.get();
    const userId = ctx?.userId ?? 'anon';
    const redisKey = `idempotency:${userId}:${idempotencyKey}`;

    return from(this.redis.get(redisKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          return of(JSON.parse(cached) as unknown);
        }

        return next.handle().pipe(
          tap((data) => {
            void this.redis
              .set(redisKey, JSON.stringify(data), TTL_SECONDS)
              .catch(() => undefined);
          }),
        );
      }),
    );
  }
}
