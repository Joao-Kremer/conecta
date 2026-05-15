import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Organization } from '../../domain/entities/organization.entity';
import { type IOrganizationRepository } from '../ports/organization.repository.port';

import { FindOrganizationUseCase } from './find-organization.use-case';

const makeOrg = (overrides: Partial<Organization> = {}): Organization =>
  ({
    id: 'org-1',
    name: 'Test',
    slug: 'test',
    documentEncrypted: null,
    logoUrl: null,
    settings: {},
    plan: 'free',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as Organization;

describe('FindOrganizationUseCase', () => {
  let useCase: FindOrganizationUseCase;
  let orgRepo: jest.Mocked<IOrganizationRepository>;

  beforeEach(() => {
    orgRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;
    useCase = new FindOrganizationUseCase(orgRepo);
  });

  it('returns org when found', async () => {
    const org = makeOrg();
    orgRepo.findById.mockResolvedValue(org);

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result.id).toBe('org-1');
    expect(result.name).toBe('Test');
    expect(result.slug).toBe('test');
    expect(result.logoUrl).toBeNull();
    expect(result.settings).toEqual({});
    expect(result.plan).toBe('free');
    expect(result.status).toBe('ACTIVE');
    expect(orgRepo.findById).toHaveBeenCalledWith('org-1');
  });

  it('throws NotFoundException when not found', async () => {
    orgRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ organizationId: 'org-1' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException with correct code when not found', async () => {
    orgRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ organizationId: 'missing-id' })).rejects.toMatchObject({
      code: 'ORGANIZATION_NOT_FOUND',
    });
  });
});
