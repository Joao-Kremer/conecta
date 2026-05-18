import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { type IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

import { LinkGuardianToStudentUseCase } from './link-guardian-to-student.use-case';

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

describe('LinkGuardianToStudentUseCase', () => {
  let useCase: LinkGuardianToStudentUseCase;
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
    useCase = new LinkGuardianToStudentUseCase(studentGuardianRepo);
  });

  it('links a guardian to a student successfully and calls repo.create', async () => {
    const link = makeLink();
    studentGuardianRepo.findLink.mockResolvedValue(null);
    studentGuardianRepo.create.mockResolvedValue(link);

    const result = await useCase.execute({
      organizationId: 'org-1',
      studentId: 'student-1',
      guardianId: 'guardian-1',
      relationship: 'FATHER',
    });

    expect(studentGuardianRepo.findLink).toHaveBeenCalledWith('student-1', 'guardian-1', 'org-1');
    expect(studentGuardianRepo.create).toHaveBeenCalledTimes(1);
    expect(studentGuardianRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        studentId: 'student-1',
        guardianId: 'guardian-1',
        relationship: 'FATHER',
      }),
    );
    expect(result).toBe(link);
  });

  it('applies default flags when not provided', async () => {
    const link = makeLink();
    studentGuardianRepo.findLink.mockResolvedValue(null);
    studentGuardianRepo.create.mockResolvedValue(link);

    await useCase.execute({
      organizationId: 'org-1',
      studentId: 'student-1',
      guardianId: 'guardian-1',
      relationship: 'MOTHER',
    });

    expect(studentGuardianRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isPrimaryPayer: false,
        receivesCommunications: true,
        isEmergencyContact: false,
      }),
    );
  });

  it('respects explicitly provided flags', async () => {
    const link = makeLink();
    studentGuardianRepo.findLink.mockResolvedValue(null);
    studentGuardianRepo.create.mockResolvedValue(link);

    await useCase.execute({
      organizationId: 'org-1',
      studentId: 'student-1',
      guardianId: 'guardian-1',
      relationship: 'OTHER',
      isPrimaryPayer: true,
      receivesCommunications: false,
      isEmergencyContact: true,
    });

    expect(studentGuardianRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isPrimaryPayer: true,
        receivesCommunications: false,
        isEmergencyContact: true,
      }),
    );
  });

  it('throws ConflictException when the link already exists', async () => {
    studentGuardianRepo.findLink.mockResolvedValue(makeLink());

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        studentId: 'student-1',
        guardianId: 'guardian-1',
        relationship: 'FATHER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException with correct code when link already exists', async () => {
    studentGuardianRepo.findLink.mockResolvedValue(makeLink());

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        studentId: 'student-1',
        guardianId: 'guardian-1',
        relationship: 'FATHER',
      }),
    ).rejects.toMatchObject({ code: 'STUDENT_GUARDIAN_ALREADY_LINKED' });
  });

  it('does not call create when the link already exists', async () => {
    studentGuardianRepo.findLink.mockResolvedValue(makeLink());

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        studentId: 'student-1',
        guardianId: 'guardian-1',
        relationship: 'FATHER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(studentGuardianRepo.create).not.toHaveBeenCalled();
  });

  it('generates a uuid for the id', async () => {
    const link = makeLink();
    studentGuardianRepo.findLink.mockResolvedValue(null);
    studentGuardianRepo.create.mockResolvedValue(link);

    await useCase.execute({
      organizationId: 'org-1',
      studentId: 'student-1',
      guardianId: 'guardian-1',
      relationship: 'FATHER',
    });

    const callArg = studentGuardianRepo.create.mock.calls[0]![0];
    expect(typeof callArg.id).toBe('string');
    expect(callArg.id.length).toBeGreaterThan(0);
  });
});
