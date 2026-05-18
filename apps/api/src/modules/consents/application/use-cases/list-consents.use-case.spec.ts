import { type Consent } from '../../domain/entities/consent.entity';
import { type IConsentRepository } from '../ports/consent.repository.port';

import { ListConsentsUseCase } from './list-consents.use-case';

describe('ListConsentsUseCase', () => {
  let useCase: ListConsentsUseCase;
  let repo: jest.Mocked<IConsentRepository>;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByGuardian: jest.fn(),
      findByStudent: jest.fn(),
    } as jest.Mocked<IConsentRepository>;
    useCase = new ListConsentsUseCase(repo);
  });

  it('lists by student when studentId is given (takes precedence)', async () => {
    repo.findByStudent.mockResolvedValue([{ id: 'c1' } as Consent]);
    const res = await useCase.execute({ organizationId: 'org-1', studentId: 's-1', guardianId: 'g-1' });
    expect(repo.findByStudent).toHaveBeenCalledWith('s-1', 'org-1');
    expect(repo.findByGuardian).not.toHaveBeenCalled();
    expect(res).toHaveLength(1);
  });

  it('lists by guardian when only guardianId is given', async () => {
    repo.findByGuardian.mockResolvedValue([{ id: 'c2' } as Consent]);
    await useCase.execute({ organizationId: 'org-1', guardianId: 'g-1' });
    expect(repo.findByGuardian).toHaveBeenCalledWith('g-1', 'org-1');
  });

  it('returns empty when neither id is given', async () => {
    await expect(useCase.execute({ organizationId: 'org-1' })).resolves.toEqual([]);
  });
});
