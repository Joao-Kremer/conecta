import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Student } from '../../domain/entities/student.entity';
import { type IStudentRepository } from '../ports/student.repository.port';

import { DeleteStudentUseCase } from './delete-student.use-case';

const makeStudent = (overrides: Partial<Student> = {}): Student =>
  ({
    id: 'student-1',
    organizationId: 'org-1',
    fullName: 'Test Student',
    fullNameSearch: 'test student',
    birthDate: '2015-06-01',
    document: null,
    documentSearch: null,
    photoUrl: null,
    medicalNotes: null,
    allergies: null,
    medications: null,
    uniformSize: null,
    emergencyContact: null,
    status: 'ACTIVE',
    anonymizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as Student;

describe('DeleteStudentUseCase', () => {
  let useCase: DeleteStudentUseCase;
  let studentRepo: jest.Mocked<IStudentRepository>;

  beforeEach(() => {
    studentRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      searchByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      anonymize: jest.fn(),
    } as jest.Mocked<IStudentRepository>;
    useCase = new DeleteStudentUseCase(studentRepo);
  });

  it('soft-deletes the student successfully', async () => {
    const student = makeStudent();
    studentRepo.findById.mockResolvedValue(student);
    studentRepo.softDelete.mockResolvedValue(undefined);

    await useCase.execute({ studentId: 'student-1', organizationId: 'org-1' });

    expect(studentRepo.findById).toHaveBeenCalledWith('student-1', 'org-1');
    expect(studentRepo.softDelete).toHaveBeenCalledWith('student-1', 'org-1');
  });

  it('throws NotFoundException when student does not exist', async () => {
    studentRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ studentId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when student not found', async () => {
    studentRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ studentId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND' });
  });

  it('does not call softDelete when student is not found', async () => {
    studentRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ studentId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(studentRepo.softDelete).not.toHaveBeenCalled();
  });
});
