import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';

import { RequestContext } from '../context/request.context';
import { CHECK_OWNERSHIP_KEY, type CheckOwnershipOptions } from '../decorators/check-ownership.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { type OwnershipScope } from '../ownership/ownership-resolver.interface';
import { OwnershipResolverRegistry } from '../ownership/ownership-resolver.registry';

import { MATCHED_SCOPE_KEY } from './permissions.guard';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: OwnershipResolverRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const options = this.reflector.getAllAndOverride<CheckOwnershipOptions | undefined>(
      CHECK_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const req = context.switchToHttp().getRequest<Request & Record<string, unknown>>();
    const scope = req[MATCHED_SCOPE_KEY] as OwnershipScope | undefined;
    if (!scope) return true;

    const rawId = req.params[options.paramName];
    const resourceId = typeof rawId === 'string' ? rawId : undefined;
    if (!resourceId) throw new ForbiddenException();

    const resolver = this.registry.get(options.resource);
    if (!resolver) throw new ForbiddenException(`No ownership resolver for resource: ${options.resource}`);

    const ctx = RequestContext.getOrThrow();
    const allowed = await resolver.canAccess(scope, resourceId, ctx);
    if (!allowed) throw new ForbiddenException();

    return true;
  }
}
