import { type SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { Student } from '../../domain/entities/student.entity';
import { type IStudentRepository } from '../ports/student.repository.port';

import { ListStudentsUseCase } from './list-students.use-case';

const makeStudent = (id: string, overrides: Partial<Student> = {}): Student =>
  ({
    id,
    organizationId: 'org-1',
    fullName: `Student ${id}`,
    fullNameSearch: `student ${id}`,
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

describe('ListStudentsUseCase', () => {
  let useCase: ListStudentsUseCase;
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
    useCase = new ListStudentsUseCase(studentRepo, searchHash);
  });

  it('returns all students for the organization when no filters provided', async () => {
    const students = [makeStudent('student-1'), makeStudent('student-2')];
    studentRepo.findAll.mockResolvedValue(students);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual(students);
    expect(studentRepo.findAll).toHaveBeenCalledWith('org-1', {
      search: undefined,
      status: undefined,
    });
  });

  it('normalizes the search string before passing it to the repository', async () => {
    studentRepo.findAll.mockResolvedValue([]);

    await useCase.execute({ organizationId: 'org-1', search: 'João' });

    expect(searchHash.normalizeText).toHaveBeenCalledWith('João');
    expect(studentRepo.findAll).toHaveBeenCalledWith('org-1', {
      search: 'João',
      status: undefined,
    });
  });

  it('passes the status filter through to the repository', async () => {
    studentRepo.findAll.mockResolvedValue([]);

    await useCase.execute({ organizationId: 'org-1', status: 'INACTIVE' });

    expect(studentRepo.findAll).toHaveBeenCalledWith('org-1', {
      search: undefined,
      status: 'INACTIVE',
    });
  });

  it('returns empty array when no students exist', async () => {
    studentRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result).toEqual([]);
  });
});
