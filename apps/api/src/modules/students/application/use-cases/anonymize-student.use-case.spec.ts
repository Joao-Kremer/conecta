import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type Student } from '../../domain/entities/student.entity';
import { type IStudentRepository } from '../ports/student.repository.port';

import { AnonymizeStudentUseCase } from './anonymize-student.use-case';

describe('AnonymizeStudentUseCase', () => {
  let useCase: AnonymizeStudentUseCase;
  let repo: jest.Mocked<IStudentRepository>;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      searchByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      anonymize: jest.fn(),
    } as jest.Mocked<IStudentRepository>;
    useCase = new AnonymizeStudentUseCase(repo);
  });

  it('anonymizes an existing student', async () => {
    repo.findById.mockResolvedValue({ id: 's-1' } as Student);
    await useCase.execute({ studentId: 's-1', organizationId: 'org-1' });
    expect(repo.anonymize).toHaveBeenCalledWith('s-1', 'org-1');
  });

  it('throws NotFound when the student does not exist (no anonymize call)', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ studentId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.anonymize).not.toHaveBeenCalled();
  });
});
