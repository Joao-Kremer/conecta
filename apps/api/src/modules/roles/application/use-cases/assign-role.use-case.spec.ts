import {
  ConflictException,
  NotFoundException,
} from '../../../../shared/exceptions/domain.exception';
import { Role } from '../../domain/entities/role.entity';
import { UserRole } from '../../domain/entities/user-role.entity';
import { type IRoleRepository, type IUserRoleRepository } from '../ports/role.repository.port';

import { AssignRoleUseCase } from './assign-role.use-case';

const makeRole = (overrides: Partial<Role> = {}): Role =>
  ({
    id: 'role-1',
    key: 'COACH',
    name: 'Coach',
    description: null,
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Role;

const makeUserRole = (overrides: Partial<UserRole> = {}): UserRole =>
  ({
    userId: 'user-1',
    roleId: 'role-1',
    assignedAt: new Date(),
    assignedBy: 'admin-1',
    ...overrides,
  }) as UserRole;

describe('AssignRoleUseCase', () => {
  let useCase: AssignRoleUseCase;
  let roleRepo: jest.Mocked<IRoleRepository>;
  let userRoleRepo: jest.Mocked<IUserRoleRepository>;

  beforeEach(() => {
    roleRepo = {
      findAll: jest.fn(),
      findByKey: jest.fn(),
      findById: jest.fn(),
    } as jest.Mocked<IRoleRepository>;

    userRoleRepo = {
      assign: jest.fn(),
      revoke: jest.fn(),
      findByUser: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IUserRoleRepository>;

    useCase = new AssignRoleUseCase(roleRepo, userRoleRepo);
  });

  it('assigns role to user and returns UserRole', async () => {
    roleRepo.findByKey.mockResolvedValue(makeRole());
    userRoleRepo.exists.mockResolvedValue(false);
    userRoleRepo.assign.mockResolvedValue(makeUserRole());

    const result = await useCase.execute({
      targetUserId: 'user-1',
      roleKey: 'COACH',
      assignedBy: 'admin-1',
      organizationId: 'org-1',
    });

    expect(result.userId).toBe('user-1');
    expect(result.roleId).toBe('role-1');
    expect(roleRepo.findByKey).toHaveBeenCalledWith('COACH');
    expect(userRoleRepo.exists).toHaveBeenCalledWith('user-1', 'role-1');
    expect(userRoleRepo.assign).toHaveBeenCalledWith('user-1', 'role-1', 'admin-1');
  });

  it('throws NotFoundException when role does not exist', async () => {
    roleRepo.findByKey.mockResolvedValue(null);

    await expect(
      useCase.execute({
        targetUserId: 'user-1',
        roleKey: 'UNKNOWN',
        assignedBy: 'admin-1',
        organizationId: 'org-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code', async () => {
    roleRepo.findByKey.mockResolvedValue(null);

    await expect(
      useCase.execute({
        targetUserId: 'user-1',
        roleKey: 'UNKNOWN',
        assignedBy: 'admin-1',
        organizationId: 'org-1',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND' });
  });

  it('throws ConflictException when role is already assigned', async () => {
    roleRepo.findByKey.mockResolvedValue(makeRole());
    userRoleRepo.exists.mockResolvedValue(true);

    await expect(
      useCase.execute({
        targetUserId: 'user-1',
        roleKey: 'COACH',
        assignedBy: 'admin-1',
        organizationId: 'org-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException with correct code', async () => {
    roleRepo.findByKey.mockResolvedValue(makeRole());
    userRoleRepo.exists.mockResolvedValue(true);

    await expect(
      useCase.execute({
        targetUserId: 'user-1',
        roleKey: 'COACH',
        assignedBy: 'admin-1',
        organizationId: 'org-1',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_ALREADY_ASSIGNED' });
  });

  it('does not call assign when role is already assigned', async () => {
    roleRepo.findByKey.mockResolvedValue(makeRole());
    userRoleRepo.exists.mockResolvedValue(true);

    await expect(
      useCase.execute({
        targetUserId: 'user-1',
        roleKey: 'COACH',
        assignedBy: 'admin-1',
        organizationId: 'org-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRoleRepo.assign).not.toHaveBeenCalled();
  });
});
