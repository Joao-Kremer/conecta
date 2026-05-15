import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { ClassEntity } from '../../domain/entities/class.entity';
import { type IClassRepository } from '../ports/class.repository.port';

import { FindClassUseCase } from './find-class.use-case';

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

describe('FindClassUseCase', () => {
  let useCase: FindClassUseCase;
  let classRepo: jest.Mocked<IClassRepository>;

  beforeEach(() => {
    classRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IClassRepository>;
    useCase = new FindClassUseCase(classRepo);
  });

  it('returns class when found', async () => {
    const cls = makeClass();
    classRepo.findById.mockResolvedValue(cls);

    const result = await useCase.execute({ classId: 'class-1', organizationId: 'org-1' });

    expect(result).toBe(cls);
    expect(classRepo.findById).toHaveBeenCalledWith('class-1', 'org-1');
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
});
