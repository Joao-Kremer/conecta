import { Modality } from '../../domain/entities/modality.entity';
import { type IModalityRepository } from '../ports/modality.repository.port';

import { ListModalitiesUseCase } from './list-modalities.use-case';

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

describe('ListModalitiesUseCase', () => {
  let useCase: ListModalitiesUseCase;
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

    useCase = new ListModalitiesUseCase(modalityRepo);
  });

  it('returns list of modalities for organization', async () => {
    const modalities = [makeModality(), makeModality({ id: 'mod-2', name: 'Basketball' })];
    modalityRepo.findAll.mockResolvedValue(modalities);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toHaveLength(2);
    const [first, second] = result;
    expect(first!.id).toBe('mod-1');
    expect(second!.name).toBe('Basketball');
    expect(modalityRepo.findAll).toHaveBeenCalledWith('org-1');
  });

  it('returns empty array when organization has no modalities', async () => {
    modalityRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual([]);
    expect(modalityRepo.findAll).toHaveBeenCalledWith('org-1');
  });
});
