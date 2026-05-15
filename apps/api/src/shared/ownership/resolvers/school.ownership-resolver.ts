import { Injectable } from '@nestjs/common';

import { type IRequestContext } from '../../context/request.context';
import { type IOwnershipResolver, type OwnershipScope } from '../ownership-resolver.interface';

@Injectable()
export class SchoolOwnershipResolver implements IOwnershipResolver {
  async canAccess(scope: OwnershipScope, resourceId: string, ctx: IRequestContext): Promise<boolean> {
    if (scope !== 'own-school') return false;
    return ctx.scopedSchoolIds?.includes(resourceId) ?? false;
  }
}
