import { SchoolModality } from '../../domain/entities/school-modality.entity';
import { type ISchoolModalityRepository } from '../ports/school-modality.repository.port';

import { ListSchoolModalitiesUseCase } from './list-school-modalities.use-case';

const makeSchoolModality = (overrides: Partial<SchoolModality> = {}): SchoolModality =>
  ({
    id: 'sm-1',
    organizationId: 'org-1',
    schoolId: 'school-1',
    modalityId: 'modality-1',
    defaultMonthlyFeeCents: 10000,
    defaultEnrollmentFeeCents: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as SchoolModality;

describe('ListSchoolModalitiesUseCase', () => {
  let useCase: ListSchoolModalitiesUseCase;
  let schoolModalityRepo: jest.Mocked<ISchoolModalityRepository>;

  beforeEach(() => {
    schoolModalityRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySchoolAndModality: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as jest.Mocked<ISchoolModalityRepository>;
    useCase = new ListSchoolModalitiesUseCase(schoolModalityRepo);
  });

  it('returns all school modalities for an organization', async () => {
    const list = [makeSchoolModality(), makeSchoolModality({ id: 'sm-2', schoolId: 'school-2' })];
    schoolModalityRepo.findAll.mockResolvedValue(list);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toBe(list);
    expect(schoolModalityRepo.findAll).toHaveBeenCalledWith('org-1', undefined);
  });

  it('passes schoolId filter when provided', async () => {
    const list = [makeSchoolModality()];
    schoolModalityRepo.findAll.mockResolvedValue(list);

    const result = await useCase.execute({ organizationId: 'org-1', schoolId: 'school-1' });

    expect(result).toBe(list);
    expect(schoolModalityRepo.findAll).toHaveBeenCalledWith('org-1', 'school-1');
  });

  it('returns empty array when no results', async () => {
    schoolModalityRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual([]);
  });
});
