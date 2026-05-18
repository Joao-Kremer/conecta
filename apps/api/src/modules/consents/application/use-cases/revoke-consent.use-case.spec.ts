import { UnprocessableException } from '../../../../shared/exceptions/domain.exception';
import { type Consent } from '../../domain/entities/consent.entity';
import { type IConsentRepository } from '../ports/consent.repository.port';

import { RevokeConsentUseCase } from './revoke-consent.use-case';

describe('RevokeConsentUseCase', () => {
  let useCase: RevokeConsentUseCase;
  let repo: jest.Mocked<IConsentRepository>;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByGuardian: jest.fn(),
      findByStudent: jest.fn(),
    } as jest.Mocked<IConsentRepository>;
    useCase = new RevokeConsentUseCase(repo);
  });

  it('appends a new tombstone row with revokedAt set (never edits the original)', async () => {
    repo.create.mockResolvedValue({ id: 'c2' } as Consent);

    await useCase.execute({
      organizationId: 'org-1',
      guardianId: 'g-1',
      ip: '1.2.3.4',
      purposes: ['marketing'],
    });

    const arg = repo.create.mock.calls[0]![0];
    expect(arg.revokedAt).toBeInstanceOf(Date);
    expect(arg.grantedFor).toEqual(['marketing']);
    expect(arg.termsVersion).toBe('revocation');
  });

  it('rejects an empty purposes list', async () => {
    await expect(
      useCase.execute({ organizationId: 'org-1', guardianId: 'g-1', ip: '1.2.3.4', purposes: [] }),
    ).rejects.toBeInstanceOf(UnprocessableException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
