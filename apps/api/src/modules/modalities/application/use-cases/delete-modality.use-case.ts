import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IModalityRepository } from '../ports/modality.repository.port';

export interface DeleteModalityInput {
  modalityId: string;
  organizationId: string;
}

@Injectable()
export class DeleteModalityUseCase {
  constructor(private readonly modalityRepo: IModalityRepository) {}

  async execute(input: DeleteModalityInput): Promise<void> {
    const existing = await this.modalityRepo.findById(input.modalityId, input.organizationId);

    if (!existing) {
      throw new NotFoundException('MODALITY_NOT_FOUND', 'Modality not found');
    }

    await this.modalityRepo.softDelete(input.modalityId, input.organizationId);
  }
}
