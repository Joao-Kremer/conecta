import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Organization } from '../../domain/entities/organization.entity';
import { type IOrganizationRepository } from '../ports/organization.repository.port';

import { UpdateOrganizationUseCase } from './update-organization.use-case';

const makeOrg = (overrides: Partial<Organization> = {}): Organization =>
  ({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
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

describe('UpdateOrganizationUseCase', () => {
  let useCase: UpdateOrganizationUseCase;
  let orgRepo: jest.Mocked<IOrganizationRepository>;

  beforeEach(() => {
    orgRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;
    useCase = new UpdateOrganizationUseCase(orgRepo);
  });

  it('updates org successfully and returns updated data', async () => {
    const existing = makeOrg();
    const updated = makeOrg({ name: 'Updated Name', logoUrl: 'https://example.com/logo.png' });

    orgRepo.findById.mockResolvedValue(existing);
    orgRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      organizationId: 'org-1',
      name: 'Updated Name',
      logoUrl: 'https://example.com/logo.png',
    });

    expect(result.id).toBe('org-1');
    expect(result.name).toBe('Updated Name');
    expect(result.logoUrl).toBe('https://example.com/logo.png');
    expect(orgRepo.findById).toHaveBeenCalledWith('org-1');
    expect(orgRepo.update).toHaveBeenCalledWith('org-1', {
      name: 'Updated Name',
      logoUrl: 'https://example.com/logo.png',
    });
  });

  it('throws NotFoundException when org does not exist', async () => {
    orgRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ organizationId: 'missing-id', name: 'New Name' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when org not found', async () => {
    orgRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ organizationId: 'missing-id' }),
    ).rejects.toMatchObject({ code: 'ORGANIZATION_NOT_FOUND' });
  });

  it('does not call update when org is not found', async () => {
    orgRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ organizationId: 'missing-id' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(orgRepo.update).not.toHaveBeenCalled();
  });
});
