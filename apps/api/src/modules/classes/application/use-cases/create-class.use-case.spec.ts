import { UnprocessableException } from '../../../../shared/exceptions/domain.exception';
import { ClassEntity } from '../../domain/entities/class.entity';
import { type IClassRepository } from '../ports/class.repository.port';

import { CreateClassUseCase } from './create-class.use-case';

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

const validSchedule = [{ weekday: 1, start: '08:00', end: '09:00' }];

describe('CreateClassUseCase', () => {
  let useCase: CreateClassUseCase;
  let classRepo: jest.Mocked<IClassRepository>;

  beforeEach(() => {
    classRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IClassRepository>;
    useCase = new CreateClassUseCase(classRepo);
  });

  it('creates a class successfully', async () => {
    const cls = makeClass();
    classRepo.create.mockResolvedValue(cls);

    const result = await useCase.execute({
      organizationId: 'org-1',
      schoolId: 'school-1',
      schoolModalityId: 'sm-1',
      name: 'Turma A',
      schedule: validSchedule,
    });

    expect(classRepo.create).toHaveBeenCalledTimes(1);
    expect(classRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        schoolId: 'school-1',
        schoolModalityId: 'sm-1',
        name: 'Turma A',
        schedule: validSchedule,
      }),
    );
    expect(result).toBe(cls);
  });

  it('generates a uuid for the id', async () => {
    const cls = makeClass();
    classRepo.create.mockResolvedValue(cls);

    await useCase.execute({
      organizationId: 'org-1',
      schoolId: 'school-1',
      schoolModalityId: 'sm-1',
      name: 'Turma A',
      schedule: validSchedule,
    });

    const callArg = classRepo.create.mock.calls[0]![0];
    expect(typeof callArg.id).toBe('string');
    expect(callArg.id.length).toBeGreaterThan(0);
  });

  it('throws UnprocessableException when weekday is out of range', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        schoolModalityId: 'sm-1',
        name: 'Turma A',
        schedule: [{ weekday: 7, start: '08:00', end: '09:00' }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableException);
  });

  it('throws UnprocessableException with INVALID_SCHEDULE code for bad weekday', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        schoolModalityId: 'sm-1',
        name: 'Turma A',
        schedule: [{ weekday: -1, start: '08:00', end: '09:00' }],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SCHEDULE' });
  });

  it('throws UnprocessableException when time format is invalid', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        schoolModalityId: 'sm-1',
        name: 'Turma A',
        schedule: [{ weekday: 1, start: '8:00', end: '09:00' }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableException);
  });

  it('throws UnprocessableException when start is not before end', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        schoolModalityId: 'sm-1',
        name: 'Turma A',
        schedule: [{ weekday: 1, start: '09:00', end: '08:00' }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableException);
  });

  it('throws UnprocessableException when start equals end', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        schoolModalityId: 'sm-1',
        name: 'Turma A',
        schedule: [{ weekday: 1, start: '08:00', end: '08:00' }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableException);
  });

  it('does not call create when schedule is invalid', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        schoolId: 'school-1',
        schoolModalityId: 'sm-1',
        name: 'Turma A',
        schedule: [{ weekday: 10, start: '08:00', end: '09:00' }],
      }),
    ).rejects.toThrow();

    expect(classRepo.create).not.toHaveBeenCalled();
  });
});
