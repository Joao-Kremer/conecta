import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { type Request } from 'express';
import { type Observable } from 'rxjs';

import { RequestContext } from '../context/request.context';

@Injectable()
export class SchoolScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = RequestContext.get();

    if (ctx?.roles?.includes('SCHOOL_STAFF') && ctx.scopedSchoolIds?.length) {
      const req = context
        .switchToHttp()
        .getRequest<Request & { scopedSchoolIds?: string[] }>();
      req.scopedSchoolIds = ctx.scopedSchoolIds;
    }

    return next.handle();
  }
}
