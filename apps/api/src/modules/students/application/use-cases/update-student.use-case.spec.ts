import { type SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Student } from '../../domain/entities/student.entity';
import { type IStudentRepository } from '../ports/student.repository.port';

import { UpdateStudentUseCase } from './update-student.use-case';

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

describe('UpdateStudentUseCase', () => {
  let useCase: UpdateStudentUseCase;
  let studentRepo: jest.Mocked<IStudentRepository>;
  let searchHash: jest.Mocked<SearchHashService>;

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
    searchHash = {
      normalizeText: jest.fn((x: string) => x),
      hash: jest.fn((x: string) => `h_${x}`),
    } as unknown as jest.Mocked<SearchHashService>;
    useCase = new UpdateStudentUseCase(studentRepo, searchHash);
  });

  it('updates student successfully and returns updated data', async () => {
    const existing = makeStudent();
    const updated = makeStudent({ fullName: 'Updated Student', uniformSize: 'M' });

    studentRepo.findById.mockResolvedValue(existing);
    studentRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      studentId: 'student-1',
      organizationId: 'org-1',
      fullName: 'Updated Student',
      uniformSize: 'M',
    });

    expect(result.fullName).toBe('Updated Student');
    expect(studentRepo.findById).toHaveBeenCalledWith('student-1', 'org-1');
    expect(studentRepo.update).toHaveBeenCalledWith('student-1', 'org-1', {
      fullName: 'Updated Student',
      fullNameSearch: 'Updated Student',
      uniformSize: 'M',
    });
  });

  it('recomputes fullNameSearch when fullName changes', async () => {
    studentRepo.findById.mockResolvedValue(makeStudent());
    studentRepo.update.mockResolvedValue(makeStudent());

    await useCase.execute({
      studentId: 'student-1',
      organizationId: 'org-1',
      fullName: 'João Silva',
    });

    expect(searchHash.normalizeText).toHaveBeenCalledWith('João Silva');
    expect(studentRepo.update).toHaveBeenCalledWith('student-1', 'org-1', {
      fullName: 'João Silva',
      fullNameSearch: 'João Silva',
    });
  });

  it('recomputes documentSearch when document changes', async () => {
    studentRepo.findById.mockResolvedValue(makeStudent());
    studentRepo.update.mockResolvedValue(makeStudent());

    await useCase.execute({
      studentId: 'student-1',
      organizationId: 'org-1',
      document: '98765432100',
    });

    expect(searchHash.hash).toHaveBeenCalledWith('98765432100');
    expect(studentRepo.update).toHaveBeenCalledWith('student-1', 'org-1', {
      document: '98765432100',
      documentSearch: 'h_98765432100',
    });
  });

  it('sets documentSearch to null when document is cleared', async () => {
    studentRepo.findById.mockResolvedValue(makeStudent());
    studentRepo.update.mockResolvedValue(makeStudent());

    await useCase.execute({
      studentId: 'student-1',
      organizationId: 'org-1',
      document: null,
    });

    expect(searchHash.hash).not.toHaveBeenCalled();
    expect(studentRepo.update).toHaveBeenCalledWith('student-1', 'org-1', {
      document: null,
      documentSearch: null,
    });
  });

  it('does not recompute search fields when neither fullName nor document change', async () => {
    studentRepo.findById.mockResolvedValue(makeStudent());
    studentRepo.update.mockResolvedValue(makeStudent());

    await useCase.execute({
      studentId: 'student-1',
      organizationId: 'org-1',
      status: 'INACTIVE',
    });

    expect(searchHash.normalizeText).not.toHaveBeenCalled();
    expect(searchHash.hash).not.toHaveBeenCalled();
    expect(studentRepo.update).toHaveBeenCalledWith('student-1', 'org-1', {
      status: 'INACTIVE',
    });
  });

  it('throws NotFoundException when student does not exist', async () => {
    studentRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ studentId: 'missing', organizationId: 'org-1', fullName: 'New Name' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when student not found', async () => {
    studentRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ studentId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND' });
  });

  it('does not call update when student is not found', async () => {
    studentRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ studentId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(studentRepo.update).not.toHaveBeenCalled();
  });
});
