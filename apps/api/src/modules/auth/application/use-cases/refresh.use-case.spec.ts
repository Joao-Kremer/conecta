import { UnauthorizedException } from '@nestjs/common';
import { type PinoLogger } from 'nestjs-pino';

import { TokenService } from '../../infrastructure/token/token.service';
import { type ISessionRepository } from '../ports/session.repository.port';
import { type IUserRoleRepository } from '../ports/user-role.repository.port';
import { type IUserRepository } from '../ports/user.repository.port';

import { RefreshUseCase } from './refresh.use-case';


const makeSession = (overrides = {}) => ({
  id: 'old-session',
  userId: 'user-1',
  refreshTokenHash: '$argon2id$...',
  family: 'family-uuid',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  revokedAt: null,
  replacedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  organizationId: 'org-1',
  email: 'user@org.com',
  name: 'User',
  passwordHash: '$argon2id$...',
  status: 'ACTIVE',
  mfaEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

describe('RefreshUseCase', () => {
  let useCase: RefreshUseCase;
  let sessionRepo: jest.Mocked<ISessionRepository>;
  let userRepo: jest.Mocked<IUserRepository>;
  let userRoleRepo: jest.Mocked<IUserRoleRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let logger: jest.Mocked<PinoLogger>;

  beforeEach(() => {
    sessionRepo = {
      create: jest.fn().mockResolvedValue({ id: 'new-session' }),
      findById: jest.fn().mockResolvedValue(makeSession()),
      findActiveByFamily: jest.fn(),
      revoke: jest.fn(),
      revokeFamily: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn(),
      markReplaced: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<ISessionRepository>;

    userRepo = {
      findById: jest.fn().mockResolvedValue(makeUser()),
      findByEmail: jest.fn(),
      findByVerificationToken: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      countByEmail: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    userRoleRepo = {
      findRoleIdByKey: jest.fn(),
      assignRole: jest.fn(),
      getUserRoleKeys: jest.fn().mockResolvedValue(['SCHOOL_STAFF']),
      assignStaffSchool: jest.fn(),
    } as jest.Mocked<IUserRoleRepository>;

    tokenService = {
      signAccessToken: jest.fn().mockReturnValue('new.access.token'),
      verifyAccessToken: jest.fn(),
      generateRefreshToken: jest.fn().mockResolvedValue({
        raw: 'newraw',
        hash: '$argon2id$new',
        cookieValue: 'new-session:newraw',
      }),
      verifyRefreshToken: jest.fn().mockResolvedValue(true),
      parseRefreshCookie: jest.fn().mockReturnValue({ sessionId: 'old-session', raw: 'rawtoken' }),
    } as unknown as jest.Mocked<TokenService>;

    logger = { warn: jest.fn() } as unknown as jest.Mocked<PinoLogger>;

    useCase = new RefreshUseCase(sessionRepo, userRepo, userRoleRepo, tokenService, logger);
  });

  it('issues new token pair on valid refresh', async () => {
    const result = await useCase.execute({ refreshCookieValue: 'old-session:rawtoken' });

    expect(result.accessToken).toBe('new.access.token');
    expect(result.refreshCookieValue).toBe('new-session:newraw');
    expect(sessionRepo.markReplaced).toHaveBeenCalledWith('old-session', expect.any(String));
    expect(sessionRepo.create).toHaveBeenCalled();
  });

  it('throws UnauthorizedException when cookie cannot be parsed', async () => {
    tokenService.parseRefreshCookie.mockReturnValue(null);

    await expect(
      useCase.execute({ refreshCookieValue: 'bad-cookie' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when session not found', async () => {
    sessionRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshCookieValue: 'old-session:rawtoken' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when session is revoked', async () => {
    sessionRepo.findById.mockResolvedValue(makeSession({ revokedAt: new Date() }));

    await expect(
      useCase.execute({ refreshCookieValue: 'old-session:rawtoken' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes entire family and throws when reuse detected (replacedById set)', async () => {
    sessionRepo.findById.mockResolvedValue(makeSession({ replacedById: 'already-replaced' }));

    await expect(
      useCase.execute({ refreshCookieValue: 'old-session:rawtoken' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(sessionRepo.revokeFamily).toHaveBeenCalledWith('family-uuid');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('throws UnauthorizedException when token hash mismatch', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue(false);

    await expect(
      useCase.execute({ refreshCookieValue: 'old-session:wrongraw' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when session is expired', async () => {
    sessionRepo.findById.mockResolvedValue(
      makeSession({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      useCase.execute({ refreshCookieValue: 'old-session:rawtoken' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
