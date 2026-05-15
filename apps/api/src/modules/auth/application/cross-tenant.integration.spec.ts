import { UnauthorizedException } from '@nestjs/common';

import { PasswordService } from '../../../infrastructure/crypto/password.service';
import { TokenService } from '../infrastructure/token/token.service';

import { type ISessionRepository } from './ports/session.repository.port';
import { type IUserRoleRepository } from './ports/user-role.repository.port';
import { type IUserRepository } from './ports/user.repository.port';
import { LoginUseCase } from './use-cases/login.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';

// Minimal in-memory User repo scoped to organizationId
function makeUserRepo(users: Array<{ id: string; organizationId: string; email: string; passwordHash: string; status: string }>): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn().mockImplementation((orgId: string, email: string) =>
      Promise.resolve(users.find((u) => u.organizationId === orgId && u.email === email) ?? null),
    ),
    findById: jest.fn().mockImplementation((id: string) =>
      Promise.resolve(users.find((u) => u.id === id) ?? null),
    ),
    findByVerificationToken: jest.fn().mockResolvedValue(null),
    findByPasswordResetToken: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    countByEmail: jest.fn().mockResolvedValue(0),
  } as jest.Mocked<IUserRepository>;
}

function makeSessionRepo(): { repo: jest.Mocked<ISessionRepository>; sessions: Map<string, { id: string; userId: string; revokedAt?: Date }> } {
  const sessions = new Map<string, { id: string; userId: string; revokedAt?: Date }>();
  const repo: jest.Mocked<ISessionRepository> = {
    create: jest.fn().mockImplementation((s) => { sessions.set(s.id, s); return Promise.resolve(s); }),
    findById: jest.fn().mockImplementation((id: string) => Promise.resolve(sessions.get(id) ?? null)),
    findActiveByFamily: jest.fn().mockResolvedValue(null),
    revoke: jest.fn().mockImplementation((id: string) => {
      const s = sessions.get(id);
      if (s) s.revokedAt = new Date();
      return Promise.resolve();
    }),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    markReplaced: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<ISessionRepository>;
  return { repo, sessions };
}

const makePasswordService = (): jest.Mocked<PasswordService> =>
  ({
    hash: jest.fn().mockResolvedValue('$hash$'),
    verify: jest.fn().mockResolvedValue(true),
    needsRehash: jest.fn().mockReturnValue(false),
  }) as unknown as jest.Mocked<PasswordService>;

const makeTokenService = (): jest.Mocked<TokenService> =>
  ({
    signAccessToken: jest.fn().mockReturnValue('access.token'),
    verifyAccessToken: jest.fn(),
    generateRefreshToken: jest.fn().mockResolvedValue({ raw: 'raw', hash: '$hash$', cookieValue: 'sid:raw' }),
    verifyRefreshToken: jest.fn(),
    parseRefreshCookie: jest.fn(),
  }) as unknown as jest.Mocked<TokenService>;

const makeUserRoleRepo = (): jest.Mocked<IUserRoleRepository> =>
  ({
    findRoleIdByKey: jest.fn().mockResolvedValue(null),
    assignRole: jest.fn().mockResolvedValue(undefined),
    getUserRoleKeys: jest.fn().mockResolvedValue([]),
    assignStaffSchool: jest.fn().mockResolvedValue(undefined),
  }) as jest.Mocked<IUserRoleRepository>;

describe('Cross-tenant isolation', () => {
  it('login rejects a user from org-A when using org-B as organizationId', async () => {
    const userInOrgA = { id: 'user-a', organizationId: 'org-a', email: 'a@test.com', passwordHash: '$hash$', status: 'ACTIVE' };
    const userRepo = makeUserRepo([userInOrgA]);
    const { repo: sessionRepo } = makeSessionRepo();
    const passwordService = makePasswordService();
    const tokenService = makeTokenService();
    const userRoleRepo = makeUserRoleRepo();

    const loginUseCase = new LoginUseCase(userRepo, sessionRepo, userRoleRepo, passwordService, tokenService);

    await expect(
      loginUseCase.execute({ organizationId: 'org-b', email: 'a@test.com', password: 'pw' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revoking session of user A does not affect sessions of user B', async () => {
    const { repo: sessionRepo, sessions } = makeSessionRepo();

    // Create two sessions for two different users
    await sessionRepo.create({ id: 'sess-a', userId: 'user-a', refreshTokenHash: '$h$', family: 'fam-a', expiresAt: new Date(Date.now() + 999999) });
    await sessionRepo.create({ id: 'sess-b', userId: 'user-b', refreshTokenHash: '$h$', family: 'fam-b', expiresAt: new Date(Date.now() + 999999) });

    const logoutUseCase = new LogoutUseCase(sessionRepo);
    await logoutUseCase.execute({ sessionId: 'sess-a' });

    expect(sessions.get('sess-a')?.revokedAt).toBeDefined();
    expect(sessions.get('sess-b')?.revokedAt).toBeUndefined();
  });

  it('findByEmail with org-B id does not return users from org-A', async () => {
    const userInOrgA = { id: 'user-a', organizationId: 'org-a', email: 'shared@test.com', passwordHash: '$hash$', status: 'ACTIVE' };
    const userRepo = makeUserRepo([userInOrgA]);

    const result = await userRepo.findByEmail('org-b', 'shared@test.com');
    expect(result).toBeNull();
  });
});
