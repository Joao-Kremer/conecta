import { randomUUID } from 'node:crypto';

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type Request, type Response } from 'express';
import { type Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';

import { AuditLog } from '../../modules/audit/domain/entities/audit-log.entity';
import { RequestContext } from '../context/request.context';

const AUDITABLE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (!AUDITABLE_METHODS.has(req.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          void this.writeAuditLog(req).catch((err: unknown) => {
            this.logger.error('Failed to write audit log', err);
          });
        }
      }),
    );
  }

  private async writeAuditLog(req: Request): Promise<void> {
    const ctx = RequestContext.get();
    const organizationId = ctx?.organizationId;
    if (!organizationId) return;

    const pathParts = req.path.split('/').filter(Boolean);
    const nonVersion = pathParts.filter((p) => !/^v\d+$/.test(p));
    const resource = nonVersion[0] ?? 'unknown';
    const lastSegment = nonVersion[nonVersion.length - 1];
    const resourceId = lastSegment && UUID_RE.test(lastSegment) ? lastSegment : undefined;

    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = forwarded?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? null;

    await this.ds.getRepository(AuditLog).insert({
      id: randomUUID(),
      organizationId,
      actorUserId: ctx?.userId ?? null,
      action: req.method.toLowerCase(),
      resource,
      resourceId: resourceId ?? null,
      ip,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      requestId: ctx?.requestId ?? null,
    });
  }
}
