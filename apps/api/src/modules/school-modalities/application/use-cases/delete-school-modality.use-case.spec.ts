import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { SchoolModality } from '../../domain/entities/school-modality.entity';
import { type ISchoolModalityRepository } from '../ports/school-modality.repository.port';

import { DeleteSchoolModalityUseCase } from './delete-school-modality.use-case';

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

describe('DeleteSchoolModalityUseCase', () => {
  let useCase: DeleteSchoolModalityUseCase;
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
    useCase = new DeleteSchoolModalityUseCase(schoolModalityRepo);
  });

  it('removes school modality successfully', async () => {
    const existing = makeSchoolModality();
    schoolModalityRepo.findById.mockResolvedValue(existing);
    schoolModalityRepo.remove.mockResolvedValue(undefined);

    await useCase.execute({ id: 'sm-1', organizationId: 'org-1' });

    expect(schoolModalityRepo.remove).toHaveBeenCalledWith('sm-1', 'org-1');
  });

  it('throws NotFoundException when school modality does not exist', async () => {
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

  it('does not call remove when not found', async () => {
    schoolModalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'sm-missing', organizationId: 'org-1' }),
    ).rejects.toThrow();

    expect(schoolModalityRepo.remove).not.toHaveBeenCalled();
  });
});
