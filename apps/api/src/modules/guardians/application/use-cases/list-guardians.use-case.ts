import { Injectable } from '@nestjs/common';

import { type Guardian } from '../../domain/entities/guardian.entity';
import { IGuardianRepository } from '../ports/guardian.repository.port';

export interface ListGuardiansInput {
  organizationId: string;
}

@Injectable()
export class ListGuardiansUseCase {
  constructor(private readonly guardianRepo: IGuardianRepository) {}

  async execute(input: ListGuardiansInput): Promise<Guardian[]> {
    return this.guardianRepo.findAll(input.organizationId);
  }
}
