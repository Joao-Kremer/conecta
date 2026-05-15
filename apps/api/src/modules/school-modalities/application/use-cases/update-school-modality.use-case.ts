import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type SchoolModality } from '../../domain/entities/school-modality.entity';
import { ISchoolModalityRepository } from '../ports/school-modality.repository.port';

export interface UpdateSchoolModalityInput {
  id: string;
  organizationId: string;
  defaultMonthlyFeeCents?: number;
  defaultEnrollmentFeeCents?: number;
  active?: boolean;
}

@Injectable()
export class UpdateSchoolModalityUseCase {
  constructor(private readonly schoolModalityRepo: ISchoolModalityRepository) {}

  async execute(input: UpdateSchoolModalityInput): Promise<SchoolModality> {
    const existing = await this.schoolModalityRepo.findById(input.id, input.organizationId);

    if (!existing) {
      throw new NotFoundException('SCHOOL_MODALITY_NOT_FOUND', 'School modality not found');
    }

    return this.schoolModalityRepo.update(input.id, input.organizationId, {
      defaultMonthlyFeeCents: input.defaultMonthlyFeeCents,
      defaultEnrollmentFeeCents: input.defaultEnrollmentFeeCents,
      active: input.active,
    });
  }
}
