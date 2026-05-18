import { UnprocessableException } from '../../../../shared/exceptions/domain.exception';
import { type Consent } from '../../domain/entities/consent.entity';
import { type IConsentRepository } from '../ports/consent.repository.port';

import { RecordConsentUseCase } from './record-consent.use-case';

describe('RecordConsentUseCase', () => {
  let useCase: RecordConsentUseCase;
  let repo: jest.Mocked<IConsentRepository>;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByGuardian: jest.fn(),
      findByStudent: jest.fn(),
    } as jest.Mocked<IConsentRepository>;
    useCase = new RecordConsentUseCase(repo);
  });

  it('records a consent with a generated id and revokedAt null', async () => {
    repo.create.mockResolvedValue({ id: 'c1' } as Consent);

    await useCase.execute({
      organizationId: 'org-1',
      guardianId: 'g-1',
      studentId: 's-1',
      termsVersion: 'v1',
      ip: '1.2.3.4',
      grantedFor: ['data_processing'],
    });

    expect(repo.create).toHaveBeenCalledTimes(1);
    const arg = repo.create.mock.calls[0]![0];
    expect(typeof arg.id).toBe('string');
    expect(arg.id.length).toBeGreaterThan(0);
    expect(arg.revokedAt).toBeNull();
    expect(arg.grantedFor).toEqual(['data_processing']);
  });

  it('rejects an empty grantedFor list', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        guardianId: 'g-1',
        termsVersion: 'v1',
        ip: '1.2.3.4',
        grantedFor: [],
      }),
    ).rejects.toBeInstanceOf(UnprocessableException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
