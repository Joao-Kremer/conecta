import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { RedisService } from '../../../infrastructure/redis/redis.service';

const TTL_PERMS = 300;
const TTL_SCOPES = 300;

export interface CachedUserContext {
  permissions: string[];
  scopedSchoolIds: string[];
  coachedClassIds: string[];
}

@Injectable()
export class PermissionCacheService {
  constructor(
    private readonly redis: RedisService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  async load(userId: string): Promise<CachedUserContext> {
    const cached = await this.redis.get(`perms:user:${userId}`);
    if (cached) return JSON.parse(cached) as CachedUserContext;

    const permsRows = await this.ds.query<{ key: string }[]>(
      `SELECT DISTINCT p.key
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = $1`,
      [userId],
    );

    const schoolRows = await this.ds.query<{ school_id: string }[]>(
      `SELECT school_id FROM staff_schools WHERE user_id = $1`,
      [userId],
    );

    const classRows = await this.ds.query<{ class_id: string }[]>(
      `SELECT class_id FROM coach_classes WHERE user_id = $1`,
      [userId],
    );

    const ctx: CachedUserContext = {
      permissions: permsRows.map((r) => r.key),
      scopedSchoolIds: schoolRows.map((r) => r.school_id),
      coachedClassIds: classRows.map((r) => r.class_id),
    };

    await this.redis.set(`perms:user:${userId}`, JSON.stringify(ctx), TTL_PERMS);
    return ctx;
  }

  async invalidateUser(userId: string): Promise<void> {
    const scopeKeys = await this.redis.keys(`scopes:${userId}:*`);
    await this.redis.del(`perms:user:${userId}`, ...scopeKeys);
  }

  async invalidateScopes(userId: string): Promise<void> {
    await this.redis.del(`perms:user:${userId}`);
  }
}
