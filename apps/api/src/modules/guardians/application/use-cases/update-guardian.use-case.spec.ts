import { type SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Guardian } from '../../domain/entities/guardian.entity';
import { type IGuardianRepository } from '../ports/guardian.repository.port';

import { UpdateGuardianUseCase } from './update-guardian.use-case';

const makeGuardian = (overrides: Partial<Guardian> = {}): Guardian =>
  ({
    id: 'guardian-1',
    organizationId: 'org-1',
    fullName: 'Maria Silva',
    fullNameSearch: 'maria silva',
    document: null,
    documentSearch: null,
    phone: '+5511999999999',
    phoneSearch: 'h_+5511999999999',
    email: 'maria@example.com',
    address: null,
    userId: null,
    anonymizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as Guardian;

describe('UpdateGuardianUseCase', () => {
  let useCase: UpdateGuardianUseCase;
  let guardianRepo: jest.Mocked<IGuardianRepository>;
  let searchHash: jest.Mocked<SearchHashService>;

  beforeEach(() => {
    guardianRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IGuardianRepository>;
    searchHash = {
      normalizeText: jest.fn((x: string) => x),
      hash: jest.fn((x: string) => `h_${x}`),
    } as unknown as jest.Mocked<SearchHashService>;
    useCase = new UpdateGuardianUseCase(guardianRepo, searchHash);
  });

  it('updates guardian successfully and recomputes fullNameSearch', async () => {
    const existing = makeGuardian();
    const updated = makeGuardian({ fullName: 'Maria Souza', fullNameSearch: 'Maria Souza' });

    guardianRepo.findById.mockResolvedValue(existing);
    guardianRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      guardianId: 'guardian-1',
      organizationId: 'org-1',
      fullName: 'Maria Souza',
    });

    expect(result.fullName).toBe('Maria Souza');
    expect(guardianRepo.findById).toHaveBeenCalledWith('guardian-1', 'org-1');
    expect(guardianRepo.update).toHaveBeenCalledWith('guardian-1', 'org-1', {
      fullName: 'Maria Souza',
      fullNameSearch: 'Maria Souza',
    });
  });

  it('recomputes documentSearch when document changes', async () => {
    const existing = makeGuardian();
    guardianRepo.findById.mockResolvedValue(existing);
    guardianRepo.update.mockResolvedValue(makeGuardian());

    await useCase.execute({
      guardianId: 'guardian-1',
      organizationId: 'org-1',
      document: '12345678900',
    });

    expect(searchHash.hash).toHaveBeenCalledWith('12345678900');
    expect(guardianRepo.update).toHaveBeenCalledWith('guardian-1', 'org-1', {
      document: '12345678900',
      documentSearch: 'h_12345678900',
    });
  });

  it('sets documentSearch to null when document cleared', async () => {
    const existing = makeGuardian({ document: '12345678900', documentSearch: 'h_12345678900' });
    guardianRepo.findById.mockResolvedValue(existing);
    guardianRepo.update.mockResolvedValue(makeGuardian());

    await useCase.execute({
      guardianId: 'guardian-1',
      organizationId: 'org-1',
      document: null,
    });

    expect(guardianRepo.update).toHaveBeenCalledWith('guardian-1', 'org-1', {
      document: null,
      documentSearch: null,
    });
  });

  it('recomputes phoneSearch when phone changes', async () => {
    const existing = makeGuardian();
    guardianRepo.findById.mockResolvedValue(existing);
    guardianRepo.update.mockResolvedValue(makeGuardian());

    await useCase.execute({
      guardianId: 'guardian-1',
      organizationId: 'org-1',
      phone: '+5511888888888',
    });

    expect(guardianRepo.update).toHaveBeenCalledWith('guardian-1', 'org-1', {
      phone: '+5511888888888',
      phoneSearch: 'h_+5511888888888',
    });
  });

  it('throws NotFoundException when guardian does not exist', async () => {
    guardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ guardianId: 'missing', organizationId: 'org-1', fullName: 'New Name' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code when guardian not found', async () => {
    guardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ guardianId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'GUARDIAN_NOT_FOUND' });
  });

  it('does not call update when guardian is not found', async () => {
    guardianRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ guardianId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(guardianRepo.update).not.toHaveBeenCalled();
  });
});
