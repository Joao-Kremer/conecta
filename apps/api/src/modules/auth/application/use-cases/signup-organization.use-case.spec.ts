import { BadRequestException } from '@nestjs/common';

import { PasswordService } from '../../../../infrastructure/crypto/password.service';
import { type IEmailSender } from '../ports/email-sender.port';
import { type IOrganizationRepository } from '../ports/organization.repository.port';
import { type IUserRoleRepository } from '../ports/user-role.repository.port';
import { type IUserRepository } from '../ports/user.repository.port';

import { SignupOrganizationUseCase } from './signup-organization.use-case';


const makeOrg = (overrides = {}) => ({
  id: 'org-1',
  name: 'Escola Dev',
  slug: 'escola-dev',
  status: 'ACTIVE',
  plan: 'free',
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  organizationId: 'org-1',
  email: 'admin@dev.local',
  name: 'Admin',
  passwordHash: '$argon2id$...',
  status: 'PENDING',
  mfaEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

describe('SignupOrganizationUseCase', () => {
  let useCase: SignupOrganizationUseCase;
  let orgRepo: jest.Mocked<IOrganizationRepository>;
  let userRepo: jest.Mocked<IUserRepository>;
  let userRoleRepo: jest.Mocked<IUserRoleRepository>;
  let emailSender: jest.Mocked<IEmailSender>;
  let passwordService: jest.Mocked<PasswordService>;

  beforeEach(() => {
    orgRepo = {
      create: jest.fn().mockResolvedValue(makeOrg()),
      findById: jest.fn(),
      existsBySlug: jest.fn().mockResolvedValue(false),
      countBySlugPrefix: jest.fn().mockResolvedValue(0),
    } as jest.Mocked<IOrganizationRepository>;

    userRepo = {
      create: jest.fn().mockResolvedValue(makeUser()),
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findByVerificationToken: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      countByEmail: jest.fn().mockResolvedValue(0),
    } as jest.Mocked<IUserRepository>;

    userRoleRepo = {
      findRoleIdByKey: jest.fn().mockResolvedValue('role-admin-id'),
      assignRole: jest.fn().mockResolvedValue(undefined),
      getUserRoleKeys: jest.fn().mockResolvedValue(['ADMIN']),
      assignStaffSchool: jest.fn(),
    } as jest.Mocked<IUserRoleRepository>;

    emailSender = {
      sendVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn(),
      sendInvite: jest.fn(),
    } as jest.Mocked<IEmailSender>;

    passwordService = {
      hash: jest.fn().mockResolvedValue('$argon2id$v=19$m=19456...'),
      verify: jest.fn(),
      needsRehash: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<PasswordService>;

    useCase = new SignupOrganizationUseCase(
      orgRepo,
      userRepo,
      userRoleRepo,
      passwordService,
      emailSender,
    );
  });

  it('creates org + user + assigns ADMIN role + sends verification email', async () => {
    const result = await useCase.execute({
      organizationName: 'Escola Dev',
      adminName: 'João',
      email: 'admin@dev.local',
      password: 'StrongPass1',
      acceptTerms: true,
    });

    expect(orgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Escola Dev', slug: 'escola-dev' }),
    );
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'admin@dev.local', status: 'PENDING' }),
    );
    expect(userRoleRepo.assignRole).toHaveBeenCalledWith('user-1', 'role-admin-id');
    expect(emailSender.sendVerification).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@dev.local' }),
    );
    expect(result).toMatchObject({ userId: 'user-1', organizationId: 'org-1' });
  });

  it('throws BadRequestException when acceptTerms is false', async () => {
    await expect(
      useCase.execute({
        organizationName: 'Escola Dev',
        adminName: 'João',
        email: 'admin@dev.local',
        password: 'StrongPass1',
        acceptTerms: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException for weak password (< 10 chars)', async () => {
    await expect(
      useCase.execute({
        organizationName: 'Escola Dev',
        adminName: 'João',
        email: 'admin@dev.local',
        password: 'Short1',
        acceptTerms: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException for password without digit', async () => {
    await expect(
      useCase.execute({
        organizationName: 'Escola Dev',
        adminName: 'João',
        email: 'admin@dev.local',
        password: 'NoDigitssss',
        acceptTerms: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('appends slug suffix when base slug already exists', async () => {
    orgRepo.countBySlugPrefix.mockResolvedValue(2);

    await useCase.execute({
      organizationName: 'Escola Dev',
      adminName: 'João',
      email: 'admin@dev.local',
      password: 'StrongPass1',
      acceptTerms: true,
    });

    expect(orgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'escola-dev-3' }),
    );
  });
});
