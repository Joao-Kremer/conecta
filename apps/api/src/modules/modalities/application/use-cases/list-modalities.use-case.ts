import { Injectable } from '@nestjs/common';

import { type Modality } from '../../domain/entities/modality.entity';
import { IModalityRepository } from '../ports/modality.repository.port';

export interface ListModalitiesInput {
  organizationId: string;
}

@Injectable()
export class ListModalitiesUseCase {
  constructor(private readonly modalityRepo: IModalityRepository) {}

  async execute(input: ListModalitiesInput): Promise<Modality[]> {
    return this.modalityRepo.findAll(input.organizationId);
  }
}
