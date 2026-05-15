import { UnauthorizedException } from '@nestjs/common';

import { PasswordService } from '../../../../infrastructure/crypto/password.service';
import { TokenService } from '../../infrastructure/token/token.service';
import { type ISessionRepository } from '../ports/session.repository.port';
import { type IUserRoleRepository } from '../ports/user-role.repository.port';
import { type IUserRepository } from '../ports/user.repository.port';

import { LoginUseCase } from './login.use-case';

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  organizationId: 'org-1',
  email: 'user@org.com',
  name: 'Test User',
  passwordHash: '$argon2id$v=19$...',
  status: 'ACTIVE',
  mfaEnabled: false,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let sessionRepo: jest.Mocked<ISessionRepository>;
  let userRoleRepo: jest.Mocked<IUserRoleRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn().mockResolvedValue(makeUser()),
      findById: jest.fn(),
      findByVerificationToken: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      create: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      countByEmail: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    sessionRepo = {
      create: jest.fn().mockResolvedValue({ id: 'session-1' }),
      findById: jest.fn(),
      findActiveByFamily: jest.fn(),
      revoke: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser: jest.fn(),
      markReplaced: jest.fn(),
    } as jest.Mocked<ISessionRepository>;

    userRoleRepo = {
      findRoleIdByKey: jest.fn(),
      assignRole: jest.fn(),
      getUserRoleKeys: jest.fn().mockResolvedValue(['ADMIN']),
      assignStaffSchool: jest.fn(),
    } as jest.Mocked<IUserRoleRepository>;

    passwordService = {
      hash: jest.fn(),
      verify: jest.fn().mockResolvedValue(true),
      needsRehash: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<PasswordService>;

    tokenService = {
      signAccessToken: jest.fn().mockReturnValue('access.token.here'),
      verifyAccessToken: jest.fn(),
      generateRefreshToken: jest.fn().mockResolvedValue({
        raw: 'rawtoken',
        hash: '$argon2id$...',
        cookieValue: 'session-1:rawtoken',
      }),
      verifyRefreshToken: jest.fn(),
      parseRefreshCookie: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    useCase = new LoginUseCase(userRepo, sessionRepo, userRoleRepo, passwordService, tokenService);
  });

  it('returns access token and refresh cookie on valid credentials', async () => {
    const result = await useCase.execute({
      organizationId: 'org-1',
      email: 'user@org.com',
      password: 'correct-password',
    });

    expect(result.accessToken).toBe('access.token.here');
    expect(result.refreshCookieValue).toBe('session-1:rawtoken');
    expect(result.roles).toEqual(['ADMIN']);
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('throws UnauthorizedException when user not found', async () => {
    userRepo.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ organizationId: 'org-1', email: 'ghost@org.com', password: 'pw' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when user status is PENDING', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser({ status: 'PENDING' }));

    await expect(
      useCase.execute({ organizationId: 'org-1', email: 'user@org.com', password: 'pw' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException on wrong password', async () => {
    passwordService.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ organizationId: 'org-1', email: 'user@org.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rehashes password when needsRehash returns true', async () => {
    passwordService.needsRehash.mockReturnValue(true);
    passwordService.hash.mockResolvedValue('$argon2id$new-hash');

    await useCase.execute({
      organizationId: 'org-1',
      email: 'user@org.com',
      password: 'correct-password',
    });

    expect(passwordService.hash).toHaveBeenCalledWith('correct-password');
    expect(userRepo.save).toHaveBeenCalled();
  });
});
