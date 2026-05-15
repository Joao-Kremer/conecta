import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestContext } from '../context/request.context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

import { PermissionsGuard } from './permissions.guard';

const makeContext = (): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  }) as unknown as ExecutionContext;

const ROLE_PERMS: Record<string, string[]> = {
  ADMIN: [
    'organization:read', 'organization:update',
    'school:create', 'school:read', 'school:update', 'school:delete',
    'modality:create', 'modality:read', 'modality:update', 'modality:delete',
    'class:create', 'class:read', 'class:update', 'class:delete', 'class:assign-coach',
    'user:create', 'user:read', 'user:update', 'user:delete', 'user:invite',
    'role:read', 'role:assign',
  ],
  ORG_STAFF: [
    'organization:read',
    'school:read', 'school:update',
    'modality:create', 'modality:read', 'modality:update', 'modality:delete',
    'class:create', 'class:read', 'class:update', 'class:assign-coach',
    'user:read', 'user:invite', 'role:read', 'role:assign',
  ],
  SCHOOL_STAFF: [
    'school:read.own-school',
    'class:create.own-school', 'class:read.own-school', 'class:update.own-school',
    'class:assign-coach.own-school',
    'user:read.own-school', 'user:invite',
    'student:create.own-school', 'student:read.own-school',
  ],
  COACH: [
    'class:read.own',
    'attendance:create.own-class', 'attendance:read.own-school',
    'notification:create', 'notification:read',
  ],
  GUARDIAN: [
    'student:read.own', 'student:update.own',
    'guardian:read.own', 'guardian:update.own',
    'enrollment:read.own', 'attendance:read.own',
    'invoice:read.own', 'payment:read.own', 'notification:read',
  ],
};

const cases: Array<{ role: string; permission: string; expected: boolean }> = [
  // ADMIN — acesso amplo
  { role: 'ADMIN', permission: 'organization:read', expected: true },
  { role: 'ADMIN', permission: 'school:create', expected: true },
  { role: 'ADMIN', permission: 'role:assign', expected: true },
  // ORG_STAFF — lê org mas não apaga schools
  { role: 'ORG_STAFF', permission: 'organization:read', expected: true },
  { role: 'ORG_STAFF', permission: 'school:delete', expected: false },
  { role: 'ORG_STAFF', permission: 'user:invite', expected: true },
  // SCHOOL_STAFF — escopo próprio, sem criação global
  { role: 'SCHOOL_STAFF', permission: 'school:read.own-school', expected: true },
  { role: 'SCHOOL_STAFF', permission: 'school:create', expected: false },
  { role: 'SCHOOL_STAFF', permission: 'organization:read', expected: false },
  // COACH — apenas próprias turmas
  { role: 'COACH', permission: 'class:read.own', expected: true },
  { role: 'COACH', permission: 'class:create', expected: false },
  { role: 'COACH', permission: 'school:read', expected: false },
  // GUARDIAN — acesso apenas aos próprios dados
  { role: 'GUARDIAN', permission: 'notification:read', expected: true },
  { role: 'GUARDIAN', permission: 'organization:read', expected: false },
  { role: 'GUARDIAN', permission: 'class:read.own', expected: false },
];

describe('PermissionsGuard — permission matrix', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
    guard = new PermissionsGuard(reflector as unknown as Reflector);
    jest.restoreAllMocks();
  });

  for (const { role, permission, expected } of cases) {
    it(`${role} ${expected ? 'CAN' : 'CANNOT'} use '${permission}'`, () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return [permission];
        return undefined;
      });
      jest.spyOn(RequestContext, 'get').mockReturnValue({
        requestId: 'req-1',
        userId: 'user-1',
        permissions: ROLE_PERMS[role] ?? [],
      });

      if (expected) {
        expect(() => guard.canActivate(makeContext())).not.toThrow();
      } else {
        expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
      }
    });
  }
});
