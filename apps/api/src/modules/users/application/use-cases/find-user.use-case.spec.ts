import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { User } from '../../domain/entities/user.entity';
import { type IUserRepository } from '../ports/user.repository.port';

import { FindUserUseCase } from './find-user.use-case';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    organizationId: 'org-1',
    email: 'user@example.com',
    name: 'Test User',
    passwordHash: 'hash',
    avatarUrl: null,
    phoneEncrypted: null,
    status: 'ACTIVE',
    emailVerifiedAt: null,
    lastLoginAt: null,
    mfaEnabled: false,
    mfaSecretEncrypted: null,
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    passwordResetTokenHash: null,
    passwordResetTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as User;

describe('FindUserUseCase', () => {
  let useCase: FindUserUseCase;
  let userRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepo = {
      findById: jest.fn(),
      findAllByOrganization: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IUserRepository>;
    useCase = new FindUserUseCase(userRepo);
  });

  it('returns user data when found', async () => {
    const user = makeUser();
    userRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.id).toBe('user-1');
    expect(result.organizationId).toBe('org-1');
    expect(result.email).toBe('user@example.com');
    expect(result.name).toBe('Test User');
    expect(result.status).toBe('ACTIVE');
    expect(result.mfaEnabled).toBe(false);
    expect(userRepo.findById).toHaveBeenCalledWith('user-1');
  });

  it('does not expose passwordHash', async () => {
    const user = makeUser({ passwordHash: 'secret-hash' });
    userRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws NotFoundException when user not found', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ userId: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ userId: 'missing' })).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
  });
});
