import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { type IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

import { UnlinkGuardianFromStudentUseCase } from './unlink-guardian-from-student.use-case';

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

describe('UnlinkGuardianFromStudentUseCase', () => {
  let useCase: UnlinkGuardianFromStudentUseCase;
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
    useCase = new UnlinkGuardianFromStudentUseCase(studentGuardianRepo);
  });

  it('unlinks the guardian successfully', async () => {
    const link = makeLink();
    studentGuardianRepo.findById.mockResolvedValue(link);
    studentGuardianRepo.delete.mockResolvedValue(undefined);

    await useCase.execute({ id: 'link-1', organizationId: 'org-1' });

    expect(studentGuardianRepo.findById).toHaveBeenCalledWith('link-1', 'org-1');
    expect(studentGuardianRepo.delete).toHaveBeenCalledWith('link-1', 'org-1');
  });

  it('throws NotFoundException when the link does not exist', async () => {
    studentGuardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when link not found', async () => {
    studentGuardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'STUDENT_GUARDIAN_NOT_FOUND' });
  });

  it('does not call delete when the link is not found', async () => {
    studentGuardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(studentGuardianRepo.delete).not.toHaveBeenCalled();
  });
});
