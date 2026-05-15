import { School } from '../../domain/entities/school.entity';
import { type ISchoolRepository } from '../ports/school.repository.port';

import { CreateSchoolUseCase } from './create-school.use-case';

const makeSchool = (overrides: Partial<School> = {}): School =>
  ({
    id: 'school-1',
    organizationId: 'org-1',
    name: 'Test School',
    slug: 'test-school',
    address: null,
    phone: null,
    email: null,
    timezone: 'America/Sao_Paulo',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as School;

describe('CreateSchoolUseCase', () => {
  let useCase: CreateSchoolUseCase;
  let schoolRepo: jest.Mocked<ISchoolRepository>;

  beforeEach(() => {
    schoolRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      countBySlugPrefix: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<ISchoolRepository>;
    useCase = new CreateSchoolUseCase(schoolRepo);
  });

  it('creates a school successfully and calls repo.create', async () => {
    const school = makeSchool();
    schoolRepo.countBySlugPrefix.mockResolvedValue(0);
    schoolRepo.create.mockResolvedValue(school);

    const result = await useCase.execute({
      organizationId: 'org-1',
      name: 'Test School',
    });

    expect(schoolRepo.create).toHaveBeenCalledTimes(1);
    expect(schoolRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        name: 'Test School',
        slug: 'test-school',
      }),
    );
    expect(result).toBe(school);
  });

  it('generates slug correctly from name with accents and spaces', async () => {
    const school = makeSchool({ name: 'Escola São Paulo FC', slug: 'escola-sao-paulo-fc' });
    schoolRepo.countBySlugPrefix.mockResolvedValue(0);
    schoolRepo.create.mockResolvedValue(school);

    await useCase.execute({ organizationId: 'org-1', name: 'Escola São Paulo FC' });

    expect(schoolRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'escola-sao-paulo-fc' }),
    );
  });

  it('appends suffix to slug when slug prefix already exists', async () => {
    const school = makeSchool({ slug: 'test-school-2' });
    schoolRepo.countBySlugPrefix.mockResolvedValue(1);
    schoolRepo.create.mockResolvedValue(school);

    await useCase.execute({ organizationId: 'org-1', name: 'Test School' });

    expect(schoolRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'test-school-2' }),
    );
  });

  it('generates a uuid for the id', async () => {
    const school = makeSchool();
    schoolRepo.countBySlugPrefix.mockResolvedValue(0);
    schoolRepo.create.mockResolvedValue(school);

    await useCase.execute({ organizationId: 'org-1', name: 'Test School' });

    const callArg = schoolRepo.create.mock.calls[0]![0];
    expect(typeof callArg.id).toBe('string');
    expect(callArg.id.length).toBeGreaterThan(0);
  });
});
