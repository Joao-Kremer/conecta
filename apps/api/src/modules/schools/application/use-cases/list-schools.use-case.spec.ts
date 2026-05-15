import { School } from '../../domain/entities/school.entity';
import { type ISchoolRepository } from '../ports/school.repository.port';

import { ListSchoolsUseCase } from './list-schools.use-case';

const makeSchool = (id: string, overrides: Partial<School> = {}): School =>
  ({
    id,
    organizationId: 'org-1',
    name: `School ${id}`,
    slug: `school-${id}`,
    address: null,
    phone: null,
    email: null,
    timezone: 'America/Sao_Paulo',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as School;

describe('ListSchoolsUseCase', () => {
  let useCase: ListSchoolsUseCase;
  let schoolRepo: jest.Mocked<ISchoolRepository>;

  beforeEach(() => {
    schoolRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      countBySlugPrefix: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<ISchoolRepository>;
    useCase = new ListSchoolsUseCase(schoolRepo);
  });

  it('returns all schools for the organization when no scopedSchoolIds provided', async () => {
    const schools = [makeSchool('school-1'), makeSchool('school-2')];
    schoolRepo.findAll.mockResolvedValue(schools);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual(schools);
    expect(schoolRepo.findAll).toHaveBeenCalledWith('org-1', undefined);
  });

  it('passes scopedSchoolIds to repository for filtered listing', async () => {
    const schools = [makeSchool('school-1')];
    schoolRepo.findAll.mockResolvedValue(schools);

    const result = await useCase.execute({
      organizationId: 'org-1',
      scopedSchoolIds: ['school-1'],
    });

    expect(result).toEqual(schools);
    expect(schoolRepo.findAll).toHaveBeenCalledWith('org-1', ['school-1']);
  });

  it('returns empty array when no schools exist', async () => {
    schoolRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual([]);
  });
});
