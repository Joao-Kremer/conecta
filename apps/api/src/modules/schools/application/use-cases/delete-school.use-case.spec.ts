import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { School } from '../../domain/entities/school.entity';
import { type ISchoolRepository } from '../ports/school.repository.port';

import { DeleteSchoolUseCase } from './delete-school.use-case';

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

describe('DeleteSchoolUseCase', () => {
  let useCase: DeleteSchoolUseCase;
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
    useCase = new DeleteSchoolUseCase(schoolRepo);
  });

  it('soft-deletes the school successfully', async () => {
    const school = makeSchool();
    schoolRepo.findById.mockResolvedValue(school);
    schoolRepo.softDelete.mockResolvedValue(undefined);

    await useCase.execute({ schoolId: 'school-1', organizationId: 'org-1' });

    expect(schoolRepo.findById).toHaveBeenCalledWith('school-1', 'org-1');
    expect(schoolRepo.softDelete).toHaveBeenCalledWith('school-1', 'org-1');
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

  it('does not call softDelete when school is not found', async () => {
    schoolRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ schoolId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(schoolRepo.softDelete).not.toHaveBeenCalled();
  });
});
