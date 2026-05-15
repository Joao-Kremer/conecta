import { ConflictException, NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { ClassEntity } from '../../domain/entities/class.entity';
import { CoachClass } from '../../domain/entities/coach-class.entity';
import { type IClassRepository } from '../ports/class.repository.port';
import { type ICoachClassRepository } from '../ports/coach-class.repository.port';

import { AssignCoachUseCase } from './assign-coach.use-case';

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

const makeCoachClass = (overrides: Partial<CoachClass> = {}): CoachClass =>
  ({
    userId: 'user-1',
    classId: 'class-1',
    organizationId: 'org-1',
    assignedAt: new Date(),
    ...overrides,
  }) as CoachClass;

describe('AssignCoachUseCase', () => {
  let useCase: AssignCoachUseCase;
  let classRepo: jest.Mocked<IClassRepository>;
  let coachClassRepo: jest.Mocked<ICoachClassRepository>;

  beforeEach(() => {
    classRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IClassRepository>;
    coachClassRepo = {
      assign: jest.fn(),
      remove: jest.fn(),
      findByClass: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<ICoachClassRepository>;
    useCase = new AssignCoachUseCase(classRepo, coachClassRepo);
  });

  it('assigns coach successfully', async () => {
    const cls = makeClass();
    const coachClass = makeCoachClass();
    classRepo.findById.mockResolvedValue(cls);
    coachClassRepo.exists.mockResolvedValue(false);
    coachClassRepo.assign.mockResolvedValue(coachClass);

    const result = await useCase.execute({
      classId: 'class-1',
      userId: 'user-1',
      organizationId: 'org-1',
    });

    expect(coachClassRepo.assign).toHaveBeenCalledWith('class-1', 'user-1', 'org-1');
    expect(result).toBe(coachClass);
  });

  it('throws NotFoundException when class does not exist', async () => {
    classRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ classId: 'class-missing', userId: 'user-1', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when coach is already assigned', async () => {
    const cls = makeClass();
    classRepo.findById.mockResolvedValue(cls);
    coachClassRepo.exists.mockResolvedValue(true);

    await expect(
      useCase.execute({ classId: 'class-1', userId: 'user-1', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException with correct code when coach already assigned', async () => {
    const cls = makeClass();
    classRepo.findById.mockResolvedValue(cls);
    coachClassRepo.exists.mockResolvedValue(true);

    await expect(
      useCase.execute({ classId: 'class-1', userId: 'user-1', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'COACH_ALREADY_ASSIGNED' });
  });

  it('does not call assign when coach is already assigned', async () => {
    const cls = makeClass();
    classRepo.findById.mockResolvedValue(cls);
    coachClassRepo.exists.mockResolvedValue(true);

    await expect(
      useCase.execute({ classId: 'class-1', userId: 'user-1', organizationId: 'org-1' }),
    ).rejects.toThrow();

    expect(coachClassRepo.assign).not.toHaveBeenCalled();
  });
});
