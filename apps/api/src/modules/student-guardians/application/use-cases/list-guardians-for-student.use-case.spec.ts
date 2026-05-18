import { StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { type IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

import { ListGuardiansForStudentUseCase } from './list-guardians-for-student.use-case';

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

describe('ListGuardiansForStudentUseCase', () => {
  let useCase: ListGuardiansForStudentUseCase;
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
    useCase = new ListGuardiansForStudentUseCase(studentGuardianRepo);
  });

  it('returns the guardians linked to the student', async () => {
    const links = [makeLink(), makeLink({ id: 'link-2', guardianId: 'guardian-2' })];
    studentGuardianRepo.findByStudent.mockResolvedValue(links);

    const result = await useCase.execute({ organizationId: 'org-1', studentId: 'student-1' });

    expect(studentGuardianRepo.findByStudent).toHaveBeenCalledWith('student-1', 'org-1');
    expect(result).toBe(links);
  });

  it('returns an empty array when the student has no linked guardians', async () => {
    studentGuardianRepo.findByStudent.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1', studentId: 'student-1' });

    expect(result).toEqual([]);
  });
});
