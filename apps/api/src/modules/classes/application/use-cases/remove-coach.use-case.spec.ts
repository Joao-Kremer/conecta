import { type ICoachClassRepository } from '../ports/coach-class.repository.port';

import { RemoveCoachUseCase } from './remove-coach.use-case';

describe('RemoveCoachUseCase', () => {
  let useCase: RemoveCoachUseCase;
  let coachClassRepo: jest.Mocked<ICoachClassRepository>;

  beforeEach(() => {
    coachClassRepo = {
      assign: jest.fn(),
      remove: jest.fn(),
      findByClass: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<ICoachClassRepository>;
    useCase = new RemoveCoachUseCase(coachClassRepo);
  });

  it('removes coach successfully', async () => {
    coachClassRepo.remove.mockResolvedValue(undefined);

    await useCase.execute({ classId: 'class-1', userId: 'user-1', organizationId: 'org-1' });

    expect(coachClassRepo.remove).toHaveBeenCalledWith('class-1', 'user-1', 'org-1');
  });

  it('calls remove with correct arguments', async () => {
    coachClassRepo.remove.mockResolvedValue(undefined);

    await useCase.execute({ classId: 'class-2', userId: 'user-5', organizationId: 'org-2' });

    expect(coachClassRepo.remove).toHaveBeenCalledWith('class-2', 'user-5', 'org-2');
  });
});
