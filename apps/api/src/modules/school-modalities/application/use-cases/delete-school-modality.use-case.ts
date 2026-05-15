import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { ISchoolModalityRepository } from '../ports/school-modality.repository.port';

export interface DeleteSchoolModalityInput {
  id: string;
  organizationId: string;
}

@Injectable()
export class DeleteSchoolModalityUseCase {
  constructor(private readonly schoolModalityRepo: ISchoolModalityRepository) {}

  async execute(input: DeleteSchoolModalityInput): Promise<void> {
    const existing = await this.schoolModalityRepo.findById(input.id, input.organizationId);

    if (!existing) {
      throw new NotFoundException('SCHOOL_MODALITY_NOT_FOUND', 'School modality not found');
    }

    await this.schoolModalityRepo.remove(input.id, input.organizationId);
  }
}
