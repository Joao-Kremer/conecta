import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { School } from '../../domain/entities/school.entity';
import { type ISchoolRepository } from '../ports/school.repository.port';

import { FindSchoolUseCase } from './find-school.use-case';

const makeSchool = (overrides: Partial<School> = {}): School =>
  ({
    id: 'school-1',
    organizationId: 'org-1',
    name: 'Test School',
    slug: 'test-school',
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

describe('FindSchoolUseCase', () => {
  let useCase: FindSchoolUseCase;
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
    useCase = new FindSchoolUseCase(schoolRepo);
  });

  it('returns the school when found', async () => {
    const school = makeSchool();
    schoolRepo.findById.mockResolvedValue(school);

    const result = await useCase.execute({ schoolId: 'school-1', organizationId: 'org-1' });

    expect(result).toBe(school);
    expect(schoolRepo.findById).toHaveBeenCalledWith('school-1', 'org-1');
  });

  it('throws NotFoundException when school does not exist', async () => {
    schoolRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ schoolId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when school not found', async () => {
    schoolRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ schoolId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'SCHOOL_NOT_FOUND' });
  });
});
