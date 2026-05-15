import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { SchoolModality } from '../../domain/entities/school-modality.entity';
import { type ISchoolModalityRepository } from '../ports/school-modality.repository.port';

import { CreateSchoolModalityUseCase } from './create-school-modality.use-case';

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

describe('CreateSchoolModalityUseCase', () => {
  let useCase: CreateSchoolModalityUseCase;
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
    useCase = new CreateSchoolModalityUseCase(schoolModalityRepo);
  });

  it('creates a school modality successfully', async () => {
    const sm = makeSchoolModality();
    schoolModalityRepo.findBySchoolAndModality.mockResolvedValue(null);
    schoolModalityRepo.create.mockResolvedValue(sm);

    const result = await useCase.execute({
      organizationId: 'org-1',
      schoolId: 'school-1',
      modalityId: 'modality-1',
      defaultMonthlyFeeCents: 10000,
    });

    expect(schoolModalityRepo.findBySchoolAndModality).toHaveBeenCalledWith(
      'school-1',
      'modality-1',
      'org-1',
    );
    expect(schoolModalityRepo.create).toHaveBeenCalledTimes(1);
    expect(schoolModalityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        schoolId: 'school-1',
        modalityId: 'modality-1',
        defaultMonthlyFeeCents: 10000,
      }),
    );
    expect(result).toBe(sm);
  });

  it('generates a uuid for the id', async () => {
    const sm = makeSchoolModality();
    schoolModalityRepo.findBySchoolAndModality.mockResolvedValue(null);
    schoolModalityRepo.create.mockResolvedValue(sm);

    await useCase.execute({
      organizationId: 'org-1',
      schoolId: 'school-1',
      modalityId: 'modality-1',
      defaultMonthlyFeeCents: 10000,
    });

    const callArg = schoolModalityRepo.create.mock.calls[0]![0];
    expect(typeof callArg.id).toBe('string');
    expect(callArg.id.length).toBeGreaterThan(0);
  });

  it('throws ConflictException when modality is already linked to the school', async () => {
    const existing = makeSchoolModality();
    schoolModalityRepo.findBySchoolAndModality.mockResolvedValue(existing);

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        modalityId: 'modality-1',
        defaultMonthlyFeeCents: 10000,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException with correct code', async () => {
    const existing = makeSchoolModality();
    schoolModalityRepo.findBySchoolAndModality.mockResolvedValue(existing);

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        modalityId: 'modality-1',
        defaultMonthlyFeeCents: 10000,
      }),
    ).rejects.toMatchObject({ code: 'SCHOOL_MODALITY_CONFLICT' });
  });

  it('does not call create when conflict exists', async () => {
    const existing = makeSchoolModality();
    schoolModalityRepo.findBySchoolAndModality.mockResolvedValue(existing);

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        modalityId: 'modality-1',
        defaultMonthlyFeeCents: 10000,
      }),
    ).rejects.toThrow();

    expect(schoolModalityRepo.create).not.toHaveBeenCalled();
  });
});
