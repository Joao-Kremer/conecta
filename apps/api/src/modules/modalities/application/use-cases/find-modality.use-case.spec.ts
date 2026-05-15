import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Modality } from '../../domain/entities/modality.entity';
import { type IModalityRepository } from '../ports/modality.repository.port';

import { FindModalityUseCase } from './find-modality.use-case';

const makeModality = (overrides: Partial<Modality> = {}): Modality =>
  ({
    id: 'mod-1',
    organizationId: 'org-1',
    name: 'Football',
    description: null,
    color: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as Modality;

describe('FindModalityUseCase', () => {
  let useCase: FindModalityUseCase;
  let modalityRepo: jest.Mocked<IModalityRepository>;

  beforeEach(() => {
    modalityRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IModalityRepository>;

    useCase = new FindModalityUseCase(modalityRepo);
  });

  it('returns modality when found', async () => {
    const modality = makeModality();
    modalityRepo.findById.mockResolvedValue(modality);

    const result = await useCase.execute({ modalityId: 'mod-1', organizationId: 'org-1' });

    expect(result.id).toBe('mod-1');
    expect(result.name).toBe('Football');
    expect(modalityRepo.findById).toHaveBeenCalledWith('mod-1', 'org-1');
  });

  it('throws NotFoundException when modality does not exist', async () => {
    modalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ modalityId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code', async () => {
    modalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ modalityId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'MODALITY_NOT_FOUND' });
  });
});
