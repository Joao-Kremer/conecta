import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { School } from '../../domain/entities/school.entity';
import { type ISchoolRepository } from '../ports/school.repository.port';

import { UpdateSchoolUseCase } from './update-school.use-case';

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

describe('UpdateSchoolUseCase', () => {
  let useCase: UpdateSchoolUseCase;
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
    useCase = new UpdateSchoolUseCase(schoolRepo);
  });

  it('updates school successfully and returns updated data', async () => {
    const existing = makeSchool();
    const updated = makeSchool({ name: 'Updated School', phone: '+5511999999999' });

    schoolRepo.findById.mockResolvedValue(existing);
    schoolRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      schoolId: 'school-1',
      organizationId: 'org-1',
      name: 'Updated School',
      phone: '+5511999999999',
    });

    expect(result.name).toBe('Updated School');
    expect(result.phone).toBe('+5511999999999');
    expect(schoolRepo.findById).toHaveBeenCalledWith('school-1', 'org-1');
    expect(schoolRepo.update).toHaveBeenCalledWith('school-1', 'org-1', {
      name: 'Updated School',
      phone: '+5511999999999',
    });
  });

  it('throws NotFoundException when school does not exist', async () => {
    schoolRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ schoolId: 'missing', organizationId: 'org-1', name: 'New Name' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when school not found', async () => {
    schoolRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ schoolId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'SCHOOL_NOT_FOUND' });
  });

  it('does not call update when school is not found', async () => {
    schoolRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ schoolId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(schoolRepo.update).not.toHaveBeenCalled();
  });
});
