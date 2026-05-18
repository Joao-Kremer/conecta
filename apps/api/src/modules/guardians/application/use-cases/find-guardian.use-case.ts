import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type Guardian } from '../../domain/entities/guardian.entity';
import { IGuardianRepository } from '../ports/guardian.repository.port';

export interface FindGuardianInput {
  guardianId: string;
  organizationId: string;
}

@Injectable()
export class FindGuardianUseCase {
  constructor(private readonly guardianRepo: IGuardianRepository) {}

  async execute(input: FindGuardianInput): Promise<Guardian> {
    const guardian = await this.guardianRepo.findById(input.guardianId, input.organizationId);

    if (!guardian) {
      throw new NotFoundException('GUARDIAN_NOT_FOUND', 'Guardian not found');
    }

    return guardian;
  }
}
