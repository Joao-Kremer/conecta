import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { type IRequestContext } from '../../context/request.context';
import { type IOwnershipResolver, type OwnershipScope } from '../ownership-resolver.interface';

@Injectable()
export class GuardianOwnershipResolver implements IOwnershipResolver {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async canAccess(scope: OwnershipScope, resourceId: string, ctx: IRequestContext): Promise<boolean> {
    if (!ctx.organizationId) return false;

    if (scope === 'own') {
      // This guardian record belongs to the calling user.
      if (!ctx.userId) return false;
      const rows: unknown[] = await this.ds.query(
        `SELECT 1 FROM guardians
          WHERE id = $1 AND organization_id = $2 AND user_id = $3
          LIMIT 1`,
        [resourceId, ctx.organizationId, ctx.userId],
      );
      return rows.length > 0;
    }

    // 'own-school' requires enrollments (Sprint 4) to map a guardian's
    // dependents to schools. Not grantable here yet.
    return false;
  }
}
