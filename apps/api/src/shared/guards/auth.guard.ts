import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';

import { PermissionCacheService } from '../../modules/auth/infrastructure/permission-cache.service';
import { TokenService } from '../../modules/auth/infrastructure/token/token.service';
import { RequestContext } from '../context/request.context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) throw new UnauthorizedException();

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      const userCtx = await this.permissionCache.load(payload.sub);

      const ctx = RequestContext.getOrThrow();
      ctx.userId = payload.sub;
      ctx.organizationId = payload.org;
      ctx.roles = payload.roles;
      ctx.permissions = userCtx.permissions;
      ctx.scopedSchoolIds = userCtx.scopedSchoolIds;
      ctx.coachedClassIds = userCtx.coachedClassIds;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractToken(req: Request): string | null {
    const fromCookie = (req.cookies as Record<string, string> | undefined)?.[
      '__Host-access'
    ] ?? (req.cookies as Record<string, string> | undefined)?.['access'];
    if (fromCookie) return fromCookie;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

    return null;
  }
}
