import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { SchoolModality } from '../../domain/entities/school-modality.entity';
import { type ISchoolModalityRepository } from '../ports/school-modality.repository.port';

import { FindSchoolModalityUseCase } from './find-school-modality.use-case';

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

describe('FindSchoolModalityUseCase', () => {
  let useCase: FindSchoolModalityUseCase;
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
    useCase = new FindSchoolModalityUseCase(schoolModalityRepo);
  });

  it('returns school modality when found', async () => {
    const sm = makeSchoolModality();
    schoolModalityRepo.findById.mockResolvedValue(sm);

    const result = await useCase.execute({ id: 'sm-1', organizationId: 'org-1' });

    expect(result).toBe(sm);
    expect(schoolModalityRepo.findById).toHaveBeenCalledWith('sm-1', 'org-1');
  });

  it('throws NotFoundException when not found', async () => {
    schoolModalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'sm-missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code', async () => {
    schoolModalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'sm-missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'SCHOOL_MODALITY_NOT_FOUND' });
  });
});
