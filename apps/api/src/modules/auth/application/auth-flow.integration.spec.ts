import { PasswordService } from '../../../infrastructure/crypto/password.service';
import { Organization } from '../../organizations/domain/entities/organization.entity';
import { User } from '../../users/domain/entities/user.entity';
import { Session } from '../domain/entities/session.entity';
import { TokenService } from '../infrastructure/token/token.service';

import { type IEmailSender } from './ports/email-sender.port';
import { type IOrganizationRepository } from './ports/organization.repository.port';
import { type ISessionRepository } from './ports/session.repository.port';
import { type IUserRoleRepository } from './ports/user-role.repository.port';
import { type IUserRepository } from './ports/user.repository.port';
import { LoginUseCase } from './use-cases/login.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { SignupOrganizationUseCase } from './use-cases/signup-organization.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';

// ── In-memory repos ─────────────────────────────────────────────────────────

function makeOrgRepo(): jest.Mocked<IOrganizationRepository> {
  const orgs = new Map<string, Organization>();
  return {
    create: jest.fn().mockImplementation((o) => { orgs.set(o.id, o); return Promise.resolve(o); }),
    findById: jest.fn().mockImplementation((id: string) => Promise.resolve(orgs.get(id) ?? null)),
    existsBySlug: jest.fn().mockResolvedValue(false),
    countBySlugPrefix: jest.fn().mockResolvedValue(0),
  } as jest.Mocked<IOrganizationRepository>;
}

function makeUserRepo(): { repo: jest.Mocked<IUserRepository>; users: Map<string, User> } {
  const users = new Map<string, User>();
  const repo: jest.Mocked<IUserRepository> = {
    create: jest.fn().mockImplementation((u) => { users.set(u.id, u); return Promise.resolve(u); }),
    findById: jest.fn().mockImplementation((id: string) => Promise.resolve(users.get(id) ?? null)),
    findByEmail: jest.fn().mockImplementation((orgId: string, email: string) =>
      Promise.resolve([...users.values()].find((u) => u.organizationId === orgId && u.email === email) ?? null),
    ),
    findByVerificationToken: jest.fn().mockImplementation((hash: string) =>
      Promise.resolve([...users.values()].find((u) => u.verificationTokenHash === hash) ?? null),
    ),
    findByPasswordResetToken: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((u) => { users.set(u.id, u); return Promise.resolve(u); }),
    countByEmail: jest.fn().mockResolvedValue(0),
  } as jest.Mocked<IUserRepository>;
  return { repo, users };
}

function makeSessionRepo(): { repo: jest.Mocked<ISessionRepository>; sessions: Map<string, Session> } {
  const sessions = new Map<string, Session>();
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

function makeUserRoleRepo(): jest.Mocked<IUserRoleRepository> {
  return {
    findRoleIdByKey: jest.fn().mockResolvedValue(null),
    assignRole: jest.fn().mockResolvedValue(undefined),
    getUserRoleKeys: jest.fn().mockResolvedValue(['ADMIN']),
    assignStaffSchool: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<IUserRoleRepository>;
}

const makePasswordService = (): jest.Mocked<PasswordService> =>
  ({
    hash: jest.fn().mockResolvedValue('$argon2id$hashed'),
    verify: jest.fn().mockResolvedValue(true),
    needsRehash: jest.fn().mockReturnValue(false),
  }) as unknown as jest.Mocked<PasswordService>;

const makeTokenService = (): jest.Mocked<TokenService> =>
  ({
    signAccessToken: jest.fn().mockReturnValue('access.jwt.token'),
    verifyAccessToken: jest.fn(),
    generateRefreshToken: jest.fn().mockResolvedValue({ raw: 'rawtoken', hash: '$hash$refresh', cookieValue: 'session-id:rawtoken' }),
    verifyRefreshToken: jest.fn(),
    parseRefreshCookie: jest.fn(),
  }) as unknown as jest.Mocked<TokenService>;

const makeEmailSender = (): jest.Mocked<IEmailSender> => ({
  sendVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  sendInvite: jest.fn().mockResolvedValue(undefined),
  sendWelcome: jest.fn().mockResolvedValue(undefined),
} as jest.Mocked<IEmailSender>);

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Auth flow integration (in-memory repos)', () => {
  it('completes signup → verify → login → logout in sequence', async () => {
    const orgRepo = makeOrgRepo();
    const { repo: userRepo, users } = makeUserRepo();
    const { repo: sessionRepo, sessions } = makeSessionRepo();
    const userRoleRepo = makeUserRoleRepo();
    const passwordService = makePasswordService();
    const tokenService = makeTokenService();
    const emailSender = makeEmailSender();

    // ── 1. Signup ──────────────────────────────────────────────────────────
    const signupUseCase = new SignupOrganizationUseCase(orgRepo, userRepo, userRoleRepo, passwordService, emailSender);
    const { userId, organizationId } = await signupUseCase.execute({
      organizationName: 'Test Org',
      adminName: 'João',
      email: 'admin@test.com',
      password: 'StrongPass123!',
      acceptTerms: true,
    });

    expect(userId).toBeDefined();
    expect(organizationId).toBeDefined();
    expect(emailSender.sendVerification).toHaveBeenCalledTimes(1);

    const createdUser = users.get(userId)!;
    expect(createdUser.status).toBe('PENDING');

    // ── 2. Verify email ────────────────────────────────────────────────────
    const verifyUseCase = new VerifyEmailUseCase(userRepo, emailSender);
    // The user repo's findByVerificationToken looks up by hash; the use case hashes the token internally.
    // We patch findByVerificationToken to return the user directly (simulating the hash lookup).
    userRepo.findByVerificationToken.mockResolvedValue(createdUser);
    await verifyUseCase.execute({ token: 'any-token' });

    expect(createdUser.status).toBe('ACTIVE');
    expect(emailSender.sendWelcome).toHaveBeenCalledTimes(1);

    // ── 3. Login ───────────────────────────────────────────────────────────
    const loginUseCase = new LoginUseCase(userRepo, sessionRepo, userRoleRepo, passwordService, tokenService);
    const loginResult = await loginUseCase.execute({
      organizationId,
      email: 'admin@test.com',
      password: 'StrongPass123!',
    });

    expect(loginResult.accessToken).toBe('access.jwt.token');
    expect(loginResult.refreshCookieValue).toBe('session-id:rawtoken');
    expect(sessions.size).toBe(1);

    // ── 4. Logout ──────────────────────────────────────────────────────────
    const logoutUseCase = new LogoutUseCase(sessionRepo);
    await logoutUseCase.execute({ sessionId: loginResult.sessionId });

    const session = sessions.get(loginResult.sessionId)!;
    expect(session.revokedAt).toBeDefined();
  });
});
