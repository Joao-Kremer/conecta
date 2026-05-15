import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type IUserRoleRepository } from '../ports/role.repository.port';

import { RevokeRoleUseCase } from './revoke-role.use-case';

describe('RevokeRoleUseCase', () => {
  let useCase: RevokeRoleUseCase;
  let userRoleRepo: jest.Mocked<IUserRoleRepository>;

  beforeEach(() => {
    userRoleRepo = {
      assign: jest.fn(),
      revoke: jest.fn(),
      findByUser: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IUserRoleRepository>;
    useCase = new RevokeRoleUseCase(userRoleRepo);
  });

  it('revokes role assignment when it exists', async () => {
    userRoleRepo.exists.mockResolvedValue(true);
    userRoleRepo.revoke.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ targetUserId: 'user-1', roleId: 'role-1', organizationId: 'org-1' }),
    ).resolves.toBeUndefined();

    expect(userRoleRepo.exists).toHaveBeenCalledWith('user-1', 'role-1');
    expect(userRoleRepo.revoke).toHaveBeenCalledWith('user-1', 'role-1');
  });

  it('throws NotFoundException when role assignment does not exist', async () => {
    userRoleRepo.exists.mockResolvedValue(false);

    await expect(
      useCase.execute({ targetUserId: 'user-1', roleId: 'role-1', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code', async () => {
    userRoleRepo.exists.mockResolvedValue(false);

    await expect(
      useCase.execute({ targetUserId: 'user-1', roleId: 'role-1', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'USER_ROLE_NOT_FOUND' });
  });

  it('does not call revoke when assignment does not exist', async () => {
    userRoleRepo.exists.mockResolvedValue(false);

    await expect(
      useCase.execute({ targetUserId: 'user-1', roleId: 'role-1', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(userRoleRepo.revoke).not.toHaveBeenCalled();
  });
});
