import { type SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { Guardian } from '../../domain/entities/guardian.entity';
import { type IGuardianRepository } from '../ports/guardian.repository.port';

import { CreateGuardianUseCase } from './create-guardian.use-case';

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

describe('CreateGuardianUseCase', () => {
  let useCase: CreateGuardianUseCase;
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
    useCase = new CreateGuardianUseCase(guardianRepo, searchHash);
  });

  it('creates a guardian successfully and calls repo.create', async () => {
    const guardian = makeGuardian();
    guardianRepo.create.mockResolvedValue(guardian);

    const result = await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Maria Silva',
      phone: '+5511999999999',
      email: 'maria@example.com',
    });

    expect(guardianRepo.create).toHaveBeenCalledTimes(1);
    expect(guardianRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        fullName: 'Maria Silva',
        fullNameSearch: 'Maria Silva',
        phone: '+5511999999999',
        phoneSearch: 'h_+5511999999999',
        email: 'maria@example.com',
      }),
    );
    expect(result).toBe(guardian);
  });

  it('computes documentSearch via hash when document is provided', async () => {
    const guardian = makeGuardian({ document: '12345678900', documentSearch: 'h_12345678900' });
    guardianRepo.create.mockResolvedValue(guardian);

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Maria Silva',
      document: '12345678900',
      phone: '+5511999999999',
      email: 'maria@example.com',
    });

    expect(searchHash.hash).toHaveBeenCalledWith('12345678900');
    expect(guardianRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ document: '12345678900', documentSearch: 'h_12345678900' }),
    );
  });

  it('leaves documentSearch undefined when document is not provided', async () => {
    const guardian = makeGuardian();
    guardianRepo.create.mockResolvedValue(guardian);

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Maria Silva',
      phone: '+5511999999999',
      email: 'maria@example.com',
    });

    const callArg = guardianRepo.create.mock.calls[0]![0];
    expect(callArg.documentSearch).toBeUndefined();
  });

  it('generates a uuid for the id', async () => {
    const guardian = makeGuardian();
    guardianRepo.create.mockResolvedValue(guardian);

    await useCase.execute({
      organizationId: 'org-1',
      fullName: 'Maria Silva',
      phone: '+5511999999999',
      email: 'maria@example.com',
    });

    const callArg = guardianRepo.create.mock.calls[0]![0];
    expect(typeof callArg.id).toBe('string');
    expect(callArg.id.length).toBeGreaterThan(0);
  });
});
