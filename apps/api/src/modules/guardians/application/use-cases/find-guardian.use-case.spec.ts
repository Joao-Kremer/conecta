import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Guardian } from '../../domain/entities/guardian.entity';
import { type IGuardianRepository } from '../ports/guardian.repository.port';

import { FindGuardianUseCase } from './find-guardian.use-case';

const makeGuardian = (overrides: Partial<Guardian> = {}): Guardian =>
  ({
    id: 'guardian-1',
    organizationId: 'org-1',
    fullName: 'Maria Silva',
    fullNameSearch: 'maria silva',
    document: null,
    documentSearch: null,
    phone: '+5511999999999',
    phoneSearch: 'h_+5511999999999',
    email: 'maria@example.com',
    address: null,
    userId: null,
    anonymizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as Guardian;

describe('FindGuardianUseCase', () => {
  let useCase: FindGuardianUseCase;
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
    useCase = new FindGuardianUseCase(guardianRepo);
  });

  it('returns the guardian when found', async () => {
    const guardian = makeGuardian();
    guardianRepo.findById.mockResolvedValue(guardian);

    const result = await useCase.execute({ guardianId: 'guardian-1', organizationId: 'org-1' });

    expect(result).toBe(guardian);
    expect(guardianRepo.findById).toHaveBeenCalledWith('guardian-1', 'org-1');
  });

  it('throws NotFoundException when guardian does not exist', async () => {
    guardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ guardianId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when guardian not found', async () => {
    guardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ guardianId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'GUARDIAN_NOT_FOUND' });
  });
});
