import { Role } from '../../domain/entities/role.entity';
import { type IRoleRepository } from '../ports/role.repository.port';

import { ListRolesUseCase } from './list-roles.use-case';

const makeRole = (id: string, key: string, overrides: Partial<Role> = {}): Role =>
  ({
    id,
    key,
    name: `Role ${key}`,
    description: null,
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Role;

describe('ListRolesUseCase', () => {
  let useCase: ListRolesUseCase;
  let roleRepo: jest.Mocked<IRoleRepository>;

  beforeEach(() => {
    roleRepo = {
      findAll: jest.fn(),
      findByKey: jest.fn(),
      findById: jest.fn(),
    } as jest.Mocked<IRoleRepository>;
    useCase = new ListRolesUseCase(roleRepo);
  });

  it('returns all roles', async () => {
    const roles = [makeRole('role-1', 'ADMIN'), makeRole('role-2', 'COACH')];
    roleRepo.findAll.mockResolvedValue(roles);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    const [first, second] = result;
    expect(first!.key).toBe('ADMIN');
    expect(second!.key).toBe('COACH');
    expect(roleRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no roles exist', async () => {
    roleRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
