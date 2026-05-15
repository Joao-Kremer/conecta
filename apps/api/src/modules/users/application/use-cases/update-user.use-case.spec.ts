import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { User } from '../../domain/entities/user.entity';
import { type IUserRepository } from '../ports/user.repository.port';

import { UpdateUserUseCase } from './update-user.use-case';

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

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepo = {
      findById: jest.fn(),
      findAllByOrganization: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IUserRepository>;
    useCase = new UpdateUserUseCase(userRepo);
  });

  it('updates user and returns updated data without sensitive fields', async () => {
    const existing = makeUser();
    const updated = makeUser({ name: 'New Name', avatarUrl: 'https://example.com/avatar.png' });
    userRepo.findById.mockResolvedValue(existing);
    userRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      userId: 'user-1',
      name: 'New Name',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(result.name).toBe('New Name');
    expect(result.avatarUrl).toBe('https://example.com/avatar.png');
    expect(result).not.toHaveProperty('passwordHash');
    expect(userRepo.findById).toHaveBeenCalledWith('user-1');
    expect(userRepo.update).toHaveBeenCalledWith('user-1', {
      name: 'New Name',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('throws NotFoundException when user does not exist', async () => {
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
