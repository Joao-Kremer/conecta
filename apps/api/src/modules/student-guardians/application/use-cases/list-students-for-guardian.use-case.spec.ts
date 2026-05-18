import { StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { type IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

import { ListStudentsForGuardianUseCase } from './list-students-for-guardian.use-case';

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

describe('ListStudentsForGuardianUseCase', () => {
  let useCase: ListStudentsForGuardianUseCase;
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
    useCase = new ListStudentsForGuardianUseCase(studentGuardianRepo);
  });

  it('returns the students linked to the guardian', async () => {
    const links = [makeLink(), makeLink({ id: 'link-2', studentId: 'student-2' })];
    studentGuardianRepo.findByGuardian.mockResolvedValue(links);

    const result = await useCase.execute({ organizationId: 'org-1', guardianId: 'guardian-1' });

    expect(studentGuardianRepo.findByGuardian).toHaveBeenCalledWith('guardian-1', 'org-1');
    expect(result).toBe(links);
  });

  it('returns an empty array when the guardian has no linked students', async () => {
    studentGuardianRepo.findByGuardian.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1', guardianId: 'guardian-1' });

    expect(result).toEqual([]);
  });
});
