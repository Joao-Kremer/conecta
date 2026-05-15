import { ClassEntity } from '../../domain/entities/class.entity';
import { type IClassRepository } from '../ports/class.repository.port';

import { ListClassesUseCase } from './list-classes.use-case';

const makeClass = (overrides: Partial<ClassEntity> = {}): ClassEntity =>
  ({
    id: 'class-1',
    organizationId: 'org-1',
    schoolId: 'school-1',
    schoolModalityId: 'sm-1',
    name: 'Turma A',
    ageGroup: null,
    schedule: [{ weekday: 1, start: '08:00', end: '09:00' }],
    location: null,
    capacity: null,
    monthlyFeeCents: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as ClassEntity;

describe('ListClassesUseCase', () => {
  let useCase: ListClassesUseCase;
  let classRepo: jest.Mocked<IClassRepository>;

  beforeEach(() => {
    classRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IClassRepository>;
    useCase = new ListClassesUseCase(classRepo);
  });

  it('returns all classes for an organization', async () => {
    const list = [makeClass(), makeClass({ id: 'class-2', name: 'Turma B' })];
    classRepo.findAll.mockResolvedValue(list);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toBe(list);
    expect(classRepo.findAll).toHaveBeenCalledWith('org-1', {
      schoolId: undefined,
      schoolModalityId: undefined,
    });
  });

  it('passes schoolId filter when provided', async () => {
    const list = [makeClass()];
    classRepo.findAll.mockResolvedValue(list);

    const result = await useCase.execute({ organizationId: 'org-1', schoolId: 'school-1' });

    expect(result).toBe(list);
    expect(classRepo.findAll).toHaveBeenCalledWith('org-1', {
      schoolId: 'school-1',
      schoolModalityId: undefined,
    });
  });

  it('passes schoolModalityId filter when provided', async () => {
    const list = [makeClass()];
    classRepo.findAll.mockResolvedValue(list);

    const result = await useCase.execute({ organizationId: 'org-1', schoolModalityId: 'sm-1' });

    expect(result).toBe(list);
    expect(classRepo.findAll).toHaveBeenCalledWith('org-1', {
      schoolId: undefined,
      schoolModalityId: 'sm-1',
    });
  });

  it('returns empty array when no results', async () => {
    classRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual([]);
  });
});
