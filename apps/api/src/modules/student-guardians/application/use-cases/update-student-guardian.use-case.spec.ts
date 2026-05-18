import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { type IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

import { UpdateStudentGuardianUseCase } from './update-student-guardian.use-case';

const makeLink = (overrides: Partial<StudentGuardian> = {}): StudentGuardian =>
  ({
    id: 'link-1',
    organizationId: 'org-1',
    studentId: 'student-1',
    guardianId: 'guardian-1',
    relationship: 'FATHER',
    isPrimaryPayer: false,
    receivesCommunications: true,
    isEmergencyContact: false,
    createdAt: new Date(),
    ...overrides,
  }) as StudentGuardian;

describe('UpdateStudentGuardianUseCase', () => {
  let useCase: UpdateStudentGuardianUseCase;
  let studentGuardianRepo: jest.Mocked<IStudentGuardianRepository>;

  beforeEach(() => {
    studentGuardianRepo = {
      findById: jest.fn(),
      findByStudent: jest.fn(),
      findByGuardian: jest.fn(),
      findLink: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IStudentGuardianRepository>;
    useCase = new UpdateStudentGuardianUseCase(studentGuardianRepo);
  });

  it('updates the link successfully and calls repo.update with the data fields', async () => {
    const link = makeLink();
    const updated = makeLink({ relationship: 'MOTHER', isPrimaryPayer: true });
    studentGuardianRepo.findById.mockResolvedValue(link);
    studentGuardianRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 'link-1',
      organizationId: 'org-1',
      relationship: 'MOTHER',
      isPrimaryPayer: true,
    });

    expect(studentGuardianRepo.findById).toHaveBeenCalledWith('link-1', 'org-1');
    expect(studentGuardianRepo.update).toHaveBeenCalledWith('link-1', 'org-1', {
      relationship: 'MOTHER',
      isPrimaryPayer: true,
    });
    expect(result).toBe(updated);
  });

  it('throws NotFoundException when the link does not exist', async () => {
    studentGuardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'missing', organizationId: 'org-1', relationship: 'OTHER' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when link not found', async () => {
    studentGuardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'missing', organizationId: 'org-1', relationship: 'OTHER' }),
    ).rejects.toMatchObject({ code: 'STUDENT_GUARDIAN_NOT_FOUND' });
  });

  it('does not call update when the link is not found', async () => {
    studentGuardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'missing', organizationId: 'org-1', relationship: 'OTHER' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(studentGuardianRepo.update).not.toHaveBeenCalled();
  });
});
