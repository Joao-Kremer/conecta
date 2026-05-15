import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestContext } from '../context/request.context';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const MATCHED_SCOPE_KEY = '__matchedScope';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const ctx = RequestContext.get();
    if (!ctx?.permissions) throw new ForbiddenException();

    const matched = required.find((perm) => ctx.permissions!.includes(perm));
    if (!matched) throw new ForbiddenException();

    // Pass matched scope to OwnershipGuard via request
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    const scopeMatch = matched.match(/\.(own-school|own-class|own)$/);
    if (scopeMatch) {
      req[MATCHED_SCOPE_KEY] = scopeMatch[1];
    }

    return true;
  }
}
