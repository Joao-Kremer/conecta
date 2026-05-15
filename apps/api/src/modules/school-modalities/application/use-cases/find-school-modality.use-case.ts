import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type SchoolModality } from '../../domain/entities/school-modality.entity';
import { ISchoolModalityRepository } from '../ports/school-modality.repository.port';

export interface FindSchoolModalityInput {
  id: string;
  organizationId: string;
}

@Injectable()
export class FindSchoolModalityUseCase {
  constructor(private readonly schoolModalityRepo: ISchoolModalityRepository) {}

  async execute(input: FindSchoolModalityInput): Promise<SchoolModality> {
    const sm = await this.schoolModalityRepo.findById(input.id, input.organizationId);

    if (!sm) {
      throw new NotFoundException('SCHOOL_MODALITY_NOT_FOUND', 'School modality not found');
    }

    return sm;
  }
}
