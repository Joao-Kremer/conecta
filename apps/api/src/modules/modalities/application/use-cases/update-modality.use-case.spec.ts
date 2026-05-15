import { ConflictException, NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { Modality } from '../../domain/entities/modality.entity';
import { type IModalityRepository } from '../ports/modality.repository.port';

import { UpdateModalityUseCase } from './update-modality.use-case';

const makeModality = (overrides: Partial<Modality> = {}): Modality =>
  ({
    id: 'mod-1',
    organizationId: 'org-1',
    name: 'Football',
    description: null,
    color: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as Modality;

describe('UpdateModalityUseCase', () => {
  let useCase: UpdateModalityUseCase;
  let modalityRepo: jest.Mocked<IModalityRepository>;

  beforeEach(() => {
    modalityRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as jest.Mocked<IModalityRepository>;

    useCase = new UpdateModalityUseCase(modalityRepo);
  });

  it('updates modality successfully and returns updated data', async () => {
    const existing = makeModality();
    const updated = makeModality({ name: 'Basketball', active: false });

    modalityRepo.findById.mockResolvedValue(existing);
    modalityRepo.findByName.mockResolvedValue(null);
    modalityRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      modalityId: 'mod-1',
      organizationId: 'org-1',
      name: 'Basketball',
      active: false,
    });

    expect(result.name).toBe('Basketball');
    expect(result.active).toBe(false);
    expect(modalityRepo.findById).toHaveBeenCalledWith('mod-1', 'org-1');
    expect(modalityRepo.findByName).toHaveBeenCalledWith('org-1', 'Basketball');
    expect(modalityRepo.update).toHaveBeenCalledWith(
      'mod-1',
      'org-1',
      expect.objectContaining({ name: 'Basketball', active: false }),
    );
  });

  it('skips name conflict check when name is not changed', async () => {
    const existing = makeModality();
    const updated = makeModality({ active: false });

    modalityRepo.findById.mockResolvedValue(existing);
    modalityRepo.update.mockResolvedValue(updated);

    await useCase.execute({ modalityId: 'mod-1', organizationId: 'org-1', active: false });

    expect(modalityRepo.findByName).not.toHaveBeenCalled();
  });

  it('skips conflict check when new name equals current name', async () => {
    const existing = makeModality();
    const updated = makeModality({ description: 'Updated desc' });

    modalityRepo.findById.mockResolvedValue(existing);
    modalityRepo.update.mockResolvedValue(updated);

    await useCase.execute({
      modalityId: 'mod-1',
      organizationId: 'org-1',
      name: 'Football',
    });

    expect(modalityRepo.findByName).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when modality does not exist', async () => {
    modalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ modalityId: 'missing', organizationId: 'org-1', name: 'Basketball' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException with correct code', async () => {
    modalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ modalityId: 'missing', organizationId: 'org-1' }),
    ).rejects.toMatchObject({ code: 'MODALITY_NOT_FOUND' });
  });

  it('throws ConflictException when new name already exists in organization', async () => {
    const existing = makeModality();
    const conflict = makeModality({ id: 'mod-2', name: 'Basketball' });

    modalityRepo.findById.mockResolvedValue(existing);
    modalityRepo.findByName.mockResolvedValue(conflict);

    await expect(
      useCase.execute({ modalityId: 'mod-1', organizationId: 'org-1', name: 'Basketball' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException with correct code on name conflict', async () => {
    const existing = makeModality();
    const conflict = makeModality({ id: 'mod-2', name: 'Basketball' });

    modalityRepo.findById.mockResolvedValue(existing);
    modalityRepo.findByName.mockResolvedValue(conflict);

    await expect(
      useCase.execute({ modalityId: 'mod-1', organizationId: 'org-1', name: 'Basketball' }),
    ).rejects.toMatchObject({ code: 'MODALITY_NAME_CONFLICT' });
  });

  it('does not call update when modality is not found', async () => {
    modalityRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ modalityId: 'missing', organizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(modalityRepo.update).not.toHaveBeenCalled();
  });
});
