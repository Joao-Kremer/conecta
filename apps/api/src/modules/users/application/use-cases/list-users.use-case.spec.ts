import { User } from '../../domain/entities/user.entity';
import { type IUserRepository } from '../ports/user.repository.port';

import { ListUsersUseCase } from './list-users.use-case';

const makeUser = (id: string, overrides: Partial<User> = {}): User =>
  ({
    id,
    organizationId: 'org-1',
    email: `user-${id}@example.com`,
    name: `User ${id}`,
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

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let userRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepo = {
      findById: jest.fn(),
      findAllByOrganization: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IUserRepository>;
    useCase = new ListUsersUseCase(userRepo);
  });

  it('returns list of users without sensitive fields', async () => {
    const users = [makeUser('user-1'), makeUser('user-2')];
    userRepo.findAllByOrganization.mockResolvedValue(users);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toHaveLength(2);
    const [first, second] = result;
    expect(first!.id).toBe('user-1');
    expect(second!.id).toBe('user-2');
    result.forEach((u) => expect(u).not.toHaveProperty('passwordHash'));
    expect(userRepo.findAllByOrganization).toHaveBeenCalledWith('org-1');
  });

  it('returns empty array when no users exist', async () => {
    userRepo.findAllByOrganization.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual([]);
  });
});
