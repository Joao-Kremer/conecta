import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IGuardianRepository } from '../ports/guardian.repository.port';

export interface DeleteGuardianInput {
  guardianId: string;
  organizationId: string;
}

@Injectable()
export class DeleteGuardianUseCase {
  constructor(private readonly guardianRepo: IGuardianRepository) {}

  async execute(input: DeleteGuardianInput): Promise<void> {
    const existing = await this.guardianRepo.findById(input.guardianId, input.organizationId);

    if (!existing) {
      throw new NotFoundException('GUARDIAN_NOT_FOUND', 'Guardian not found');
    }

    await this.guardianRepo.softDelete(input.guardianId, input.organizationId);
  }
}
