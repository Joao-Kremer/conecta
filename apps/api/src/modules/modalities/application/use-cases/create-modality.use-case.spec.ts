import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { Modality } from '../../domain/entities/modality.entity';
import { type IModalityRepository } from '../ports/modality.repository.port';

import { CreateModalityUseCase } from './create-modality.use-case';

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

describe('CreateModalityUseCase', () => {
  let useCase: CreateModalityUseCase;
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

    useCase = new CreateModalityUseCase(modalityRepo);
  });

  it('creates and returns a modality when name is unique', async () => {
    const created = makeModality();
    modalityRepo.findByName.mockResolvedValue(null);
    modalityRepo.create.mockResolvedValue(created);

    const result = await useCase.execute({
      organizationId: 'org-1',
      name: 'Football',
    });

    expect(result.id).toBe('mod-1');
    expect(result.name).toBe('Football');
    expect(modalityRepo.findByName).toHaveBeenCalledWith('org-1', 'Football');
    expect(modalityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        name: 'Football',
      }),
    );
  });

  it('throws ConflictException when name already exists in organization', async () => {
    modalityRepo.findByName.mockResolvedValue(makeModality());

    await expect(
      useCase.execute({ organizationId: 'org-1', name: 'Football' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException with correct code when name conflicts', async () => {
    modalityRepo.findByName.mockResolvedValue(makeModality());

    await expect(
      useCase.execute({ organizationId: 'org-1', name: 'Football' }),
    ).rejects.toMatchObject({ code: 'MODALITY_NAME_CONFLICT' });
  });

  it('does not call create when name conflicts', async () => {
    modalityRepo.findByName.mockResolvedValue(makeModality());

    await expect(
      useCase.execute({ organizationId: 'org-1', name: 'Football' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(modalityRepo.create).not.toHaveBeenCalled();
  });
});
