import { type Consent } from '../../domain/entities/consent.entity';
import { type IConsentRepository } from '../ports/consent.repository.port';

import { HasActiveConsentUseCase } from './has-active-consent.use-case';

const row = (over: Partial<Consent>): Consent =>
  ({
    id: 'c',
    organizationId: 'org-1',
    guardianId: 'g-1',
    studentId: null,
    termsVersion: 'v1',
    acceptedAt: new Date('2026-01-01'),
    revokedAt: null,
    ip: '1.2.3.4',
    userAgent: null,
    grantedFor: ['data_processing'],
    ...over,
  }) as Consent;

describe('HasActiveConsentUseCase', () => {
  let useCase: HasActiveConsentUseCase;
  let repo: jest.Mocked<IConsentRepository>;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByGuardian: jest.fn(),
      findByStudent: jest.fn(),
    } as jest.Mocked<IConsentRepository>;
    useCase = new HasActiveConsentUseCase(repo);
  });

  it('is true when a grant exists and was not later revoked', async () => {
    repo.findByGuardian.mockResolvedValue([row({ acceptedAt: new Date('2026-01-01') })]);
    await expect(
      useCase.execute({ organizationId: 'org-1', guardianId: 'g-1', purpose: 'data_processing' }),
    ).resolves.toBe(true);
  });

  it('is false when the latest event for the purpose is a revocation', async () => {
    repo.findByGuardian.mockResolvedValue([
      row({ acceptedAt: new Date('2026-01-01') }),
      row({ acceptedAt: new Date('2026-02-01'), revokedAt: new Date('2026-02-01') }),
    ]);
    await expect(
      useCase.execute({ organizationId: 'org-1', guardianId: 'g-1', purpose: 'data_processing' }),
    ).resolves.toBe(false);
  });

  it('is true again when re-granted after a revocation', async () => {
    repo.findByGuardian.mockResolvedValue([
      row({ acceptedAt: new Date('2026-01-01') }),
      row({ acceptedAt: new Date('2026-02-01'), revokedAt: new Date('2026-02-01') }),
      row({ acceptedAt: new Date('2026-03-01') }),
    ]);
    await expect(
      useCase.execute({ organizationId: 'org-1', guardianId: 'g-1', purpose: 'data_processing' }),
    ).resolves.toBe(true);
  });

  it('is false when no row mentions the purpose', async () => {
    repo.findByGuardian.mockResolvedValue([row({ grantedFor: ['marketing'] })]);
    await expect(
      useCase.execute({ organizationId: 'org-1', guardianId: 'g-1', purpose: 'data_processing' }),
    ).resolves.toBe(false);
  });
});
