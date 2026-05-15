import { randomBytes } from 'node:crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { RequestContext } from '../context/request.context';

function generateRequestId(): string {
  return `req_${randomBytes(8).toString('hex')}`;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 64
        ? incoming
        : generateRequestId();

    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    RequestContext.run({ requestId }, next);
  }
}
