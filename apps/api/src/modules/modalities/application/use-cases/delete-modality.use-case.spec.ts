import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Modality } from '../../domain/entities/modality.entity';
import { type IModalityRepository } from '../ports/modality.repository.port';

import { DeleteModalityUseCase } from './delete-modality.use-case';

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

describe('DeleteModalityUseCase', () => {
  let useCase: DeleteModalityUseCase;
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

    useCase = new DeleteModalityUseCase(modalityRepo);
  });

  it('soft deletes modality when it exists', async () => {
    modalityRepo.findById.mockResolvedValue(makeModality());
    modalityRepo.softDelete.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ modalityId: 'mod-1', organizationId: 'org-1' }),
    ).resolves.toBeUndefined();

    expect(modalityRepo.findById).toHaveBeenCalledWith('mod-1', 'org-1');
    expect(modalityRepo.softDelete).toHaveBeenCalledWith('mod-1', 'org-1');
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

  it('does not call softDelete when modality is not found', async () => {
    modalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ modalityId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(modalityRepo.softDelete).not.toHaveBeenCalled();
  });
});
