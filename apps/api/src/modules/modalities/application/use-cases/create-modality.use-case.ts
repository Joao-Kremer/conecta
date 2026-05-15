import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { type Modality } from '../../domain/entities/modality.entity';
import { IModalityRepository } from '../ports/modality.repository.port';

export interface CreateModalityInput {
  organizationId: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

@Injectable()
export class CreateModalityUseCase {
  constructor(private readonly modalityRepo: IModalityRepository) {}

  async execute(input: CreateModalityInput): Promise<Modality> {
    const existing = await this.modalityRepo.findByName(input.organizationId, input.name);

    if (existing) {
      throw new ConflictException(
        'MODALITY_NAME_CONFLICT',
        'A modality with this name already exists',
      );
    }

    return this.modalityRepo.create({
      id: uuidv7(),
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      color: input.color,
    });
  }
}
