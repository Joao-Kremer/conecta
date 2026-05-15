import { NotFoundException, UnprocessableException } from '../../../../shared/exceptions/domain.exception';
import { ClassEntity } from '../../domain/entities/class.entity';
import { type IClassRepository } from '../ports/class.repository.port';

import { UpdateClassUseCase } from './update-class.use-case';

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

describe('UpdateClassUseCase', () => {
  let useCase: UpdateClassUseCase;
  let classRepo: jest.Mocked<IClassRepository>;

  beforeEach(() => {
    classRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IClassRepository>;
    useCase = new UpdateClassUseCase(classRepo);
  });

  it('updates class successfully', async () => {
    const existing = makeClass();
    const updated = makeClass({ name: 'Turma B' });
    classRepo.findById.mockResolvedValue(existing);
    classRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      classId: 'class-1',
      organizationId: 'org-1',
      name: 'Turma B',
    });

    expect(classRepo.update).toHaveBeenCalledWith(
      'class-1',
      'org-1',
      expect.objectContaining({ name: 'Turma B' }),
    );
    expect(result).toBe(updated);
  });

  it('throws NotFoundException when class does not exist', async () => {
    classRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ classId: 'class-missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code', async () => {
    classRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ classId: 'class-missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' });
  });

  it('validates schedule when provided', async () => {
    const existing = makeClass();
    classRepo.findById.mockResolvedValue(existing);

    await expect(
      useCase.execute({
        classId: 'class-1',
        organizationId: 'org-1',
        schedule: [{ weekday: 7, start: '08:00', end: '09:00' }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableException);
  });

  it('does not validate schedule when not provided', async () => {
    const existing = makeClass();
    const updated = makeClass({ name: 'Turma B' });
    classRepo.findById.mockResolvedValue(existing);
    classRepo.update.mockResolvedValue(updated);

    await expect(
      useCase.execute({ classId: 'class-1', organizationId: 'org-1', name: 'Turma B' }),
    ).resolves.toBe(updated);
  });

  it('does not call update when not found', async () => {
    classRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ classId: 'class-missing', organizationId: 'org-1' }),
    ).rejects.toThrow();

    expect(classRepo.update).not.toHaveBeenCalled();
  });
});
