import 'dotenv/config';
import * as argon2 from 'argon2';
import { uuidv7 } from 'uuidv7';

import dataSource from '../data-source';

import { PERMISSIONS_CATALOG } from './permissions.catalog';
import { ROLE_PERMISSIONS, SYSTEM_ROLES } from './role-permissions.map';

async function main(): Promise<void> {
  await dataSource.initialize();
  const q = dataSource.createQueryRunner();
  await q.connect();
  await q.startTransaction();

  try {
    // 1. Upsert system roles
    for (const role of SYSTEM_ROLES) {
      await q.query(
        `INSERT INTO roles (id, key, name, description, organization_id)
         VALUES ($1, $2, $3, $4, NULL)
         ON CONFLICT (organization_id, key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [uuidv7(), role.key, role.name, role.description],
      );
    }

    // 2. Upsert permissions
    for (const p of PERMISSIONS_CATALOG) {
      await q.query(
        `INSERT INTO permissions (id, key, resource, action, scope)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (key) DO NOTHING`,
        [uuidv7(), p.key, p.resource, p.action, p.scope],
      );
    }

    // 3. Wire role → permissions
    for (const [roleKey, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
      const roleRows = (await q.query(
        `SELECT id FROM roles WHERE key = $1 AND organization_id IS NULL`,
        [roleKey],
      )) as { id: string }[];
      const role = roleRows[0];
      if (!role) continue;

      for (const permKey of permKeys) {
        const permRows = (await q.query(
          `SELECT id FROM permissions WHERE key = $1`,
          [permKey],
        )) as { id: string }[];
        const perm = permRows[0];
        if (!perm) continue;
        await q.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [role.id, perm.id],
        );
      }
    }

    if (process.env['NODE_ENV'] !== 'production') {
      // 4. Create dev organization
      let orgId: string;
      const existingOrg = (await q.query(
        `SELECT id FROM organizations WHERE slug = 'escola-dev'`,
      )) as { id: string }[];
      if (existingOrg.length > 0) {
        orgId = existingOrg[0]!.id;
      } else {
        orgId = uuidv7();
        await q.query(
          `INSERT INTO organizations (id, name, slug, status) VALUES ($1, $2, $3, 'ACTIVE')`,
          [orgId, 'Escola Dev', 'escola-dev'],
        );
      }

      // 5. Create dev ADMIN user
      const existing = (await q.query(
        `SELECT id FROM users WHERE organization_id = $1 AND email = 'admin@dev.local'`,
        [orgId],
      )) as { id: string }[];
      let userId: string;
      if (existing.length > 0) {
        userId = existing[0]!.id;
      } else {
        userId = uuidv7();
        const passwordHash = await argon2.hash('dev123!', {
          type: argon2.argon2id,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });
        await q.query(
          `INSERT INTO users (id, organization_id, email, password_hash, name, status, email_verified_at)
           VALUES ($1, $2, 'admin@dev.local', $3, 'Admin Dev', 'ACTIVE', now())`,
          [userId, orgId, passwordHash],
        );
      }

      // 6. Assign ADMIN role to dev user
      const adminRole = (await q.query(
        `SELECT id FROM roles WHERE key = 'ADMIN' AND organization_id IS NULL`,
      )) as { id: string }[];
      if (adminRole[0]) {
        await q.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, adminRole[0].id],
        );
      }

      console.log('✅ Dev seed complete: admin@dev.local / dev123! (org: escola-dev)');
    }

    await q.commitTransaction();
    console.log('✅ System seed complete (roles + permissions)');
  } catch (err) {
    await q.rollbackTransaction();
    throw err;
  } finally {
    await q.release();
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
