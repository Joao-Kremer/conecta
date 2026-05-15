import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type Modality } from '../../domain/entities/modality.entity';
import { IModalityRepository } from '../ports/modality.repository.port';

export interface FindModalityInput {
  modalityId: string;
  organizationId: string;
}

@Injectable()
export class FindModalityUseCase {
  constructor(private readonly modalityRepo: IModalityRepository) {}

  async execute(input: FindModalityInput): Promise<Modality> {
    const modality = await this.modalityRepo.findById(input.modalityId, input.organizationId);

    if (!modality) {
      throw new NotFoundException('MODALITY_NOT_FOUND', 'Modality not found');
    }

    return modality;
  }
}
