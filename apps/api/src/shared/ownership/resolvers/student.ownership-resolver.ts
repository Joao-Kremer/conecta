import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { type IRequestContext } from '../../context/request.context';
import { type IOwnershipResolver, type OwnershipScope } from '../ownership-resolver.interface';

@Injectable()
export class StudentOwnershipResolver implements IOwnershipResolver {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async canAccess(scope: OwnershipScope, resourceId: string, ctx: IRequestContext): Promise<boolean> {
    if (!ctx.organizationId) return false;

    if (scope === 'own') {
      // The caller is a guardian linked to this student.
      if (!ctx.userId) return false;
      const rows: unknown[] = await this.ds.query(
        `SELECT 1 FROM student_guardians sg
           JOIN guardians g ON g.id = sg.guardian_id
          WHERE sg.student_id = $1 AND sg.organization_id = $2 AND g.user_id = $3
          LIMIT 1`,
        [resourceId, ctx.organizationId, ctx.userId],
      );
      return rows.length > 0;
    }

    // 'own-school' requires the enrollments table (Sprint 4) to know which
    // school a student belongs to. Until then it cannot be granted here.
    return false;
  }
}
