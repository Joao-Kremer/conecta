import { Guardian } from '../../domain/entities/guardian.entity';
import { type IGuardianRepository } from '../ports/guardian.repository.port';

import { ListGuardiansUseCase } from './list-guardians.use-case';

const makeGuardian = (id: string, overrides: Partial<Guardian> = {}): Guardian =>
  ({
    id,
    organizationId: 'org-1',
    fullName: `Guardian ${id}`,
    fullNameSearch: `guardian ${id}`,
    document: null,
    documentSearch: null,
    phone: '+5511999999999',
    phoneSearch: 'h_+5511999999999',
    email: `${id}@example.com`,
    address: null,
    userId: null,
    anonymizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as Guardian;

describe('ListGuardiansUseCase', () => {
  let useCase: ListGuardiansUseCase;
  let guardianRepo: jest.Mocked<IGuardianRepository>;

  beforeEach(() => {
    guardianRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IGuardianRepository>;
    useCase = new ListGuardiansUseCase(guardianRepo);
  });

  it('returns all guardians for the organization', async () => {
    const guardians = [makeGuardian('guardian-1'), makeGuardian('guardian-2')];
    guardianRepo.findAll.mockResolvedValue(guardians);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual(guardians);
    expect(guardianRepo.findAll).toHaveBeenCalledWith('org-1');
  });

  it('returns empty array when no guardians exist', async () => {
    guardianRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual([]);
  });
});
