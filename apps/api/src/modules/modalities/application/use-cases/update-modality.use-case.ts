import { Injectable } from '@nestjs/common';

import { ConflictException, NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type Modality } from '../../domain/entities/modality.entity';
import { IModalityRepository } from '../ports/modality.repository.port';

export interface UpdateModalityInput {
  modalityId: string;
  organizationId: string;
  name?: string;
  description?: string | null;
  color?: string | null;
  active?: boolean;
}

@Injectable()
export class UpdateModalityUseCase {
  constructor(private readonly modalityRepo: IModalityRepository) {}

  async execute(input: UpdateModalityInput): Promise<Modality> {
    const { modalityId, organizationId, name, ...rest } = input;

    const existing = await this.modalityRepo.findById(modalityId, organizationId);

    if (!existing) {
      throw new NotFoundException('MODALITY_NOT_FOUND', 'Modality not found');
    }

    if (name !== undefined && name !== existing.name) {
      const conflict = await this.modalityRepo.findByName(organizationId, name);
      if (conflict) {
        throw new ConflictException(
          'MODALITY_NAME_CONFLICT',
          'A modality with this name already exists',
        );
      }
    }

    return this.modalityRepo.update(modalityId, organizationId, {
      ...(name !== undefined ? { name } : {}),
      ...rest,
    });
  }
}
