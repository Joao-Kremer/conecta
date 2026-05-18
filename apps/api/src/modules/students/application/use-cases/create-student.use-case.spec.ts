import { type SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { Student } from '../../domain/entities/student.entity';
import { type IStudentRepository } from '../ports/student.repository.port';

import { CreateStudentUseCase } from './create-student.use-case';

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

describe('CreateStudentUseCase', () => {
  let useCase: CreateStudentUseCase;
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
    useCase = new CreateStudentUseCase(studentRepo, searchHash);
  });

  it('creates a student successfully and calls repo.create', async () => {
    const student = makeStudent();
    studentRepo.create.mockResolvedValue(student);

    const result = await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Test Student',
      birthDate: '2015-06-01',
    });

    expect(studentRepo.create).toHaveBeenCalledTimes(1);
    expect(studentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        fullName: 'Test Student',
        fullNameSearch: 'Test Student',
        birthDate: '2015-06-01',
        status: 'ACTIVE',
      }),
    );
    expect(result).toBe(student);
  });

  it('normalizes the full name for the search column', async () => {
    studentRepo.create.mockResolvedValue(makeStudent());

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'João Silva',
      birthDate: '2015-06-01',
    });

    expect(searchHash.normalizeText).toHaveBeenCalledWith('João Silva');
  });

  it('hashes the document into documentSearch when document is provided', async () => {
    studentRepo.create.mockResolvedValue(makeStudent());

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Test Student',
      birthDate: '2015-06-01',
      document: '12345678900',
    });

    expect(searchHash.hash).toHaveBeenCalledWith('12345678900');
    expect(studentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        document: '12345678900',
        documentSearch: 'h_12345678900',
      }),
    );
  });

  it('leaves documentSearch undefined when no document is provided', async () => {
    studentRepo.create.mockResolvedValue(makeStudent());

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Test Student',
      birthDate: '2015-06-01',
    });

    expect(searchHash.hash).not.toHaveBeenCalled();
    const callArg = studentRepo.create.mock.calls[0]![0];
    expect(callArg.documentSearch).toBeUndefined();
  });

  it('defaults status to ACTIVE when not provided', async () => {
    studentRepo.create.mockResolvedValue(makeStudent());

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Test Student',
      birthDate: '2015-06-01',
    });

    expect(studentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
    );
  });

  it('respects an explicitly provided status', async () => {
    studentRepo.create.mockResolvedValue(makeStudent({ status: 'INACTIVE' }));

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Test Student',
      birthDate: '2015-06-01',
      status: 'INACTIVE',
    });

    expect(studentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'INACTIVE' }),
    );
  });

  it('generates a uuid for the id', async () => {
    studentRepo.create.mockResolvedValue(makeStudent());

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Test Student',
      birthDate: '2015-06-01',
    });

    const callArg = studentRepo.create.mock.calls[0]![0];
    expect(typeof callArg.id).toBe('string');
    expect(callArg.id.length).toBeGreaterThan(0);
  });
});
