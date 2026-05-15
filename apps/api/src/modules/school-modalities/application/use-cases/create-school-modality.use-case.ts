import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { type SchoolModality } from '../../domain/entities/school-modality.entity';
import { ISchoolModalityRepository } from '../ports/school-modality.repository.port';

export interface CreateSchoolModalityInput {
  organizationId: string;
  schoolId: string;
  modalityId: string;
  defaultMonthlyFeeCents: number;
  defaultEnrollmentFeeCents?: number;
}

@Injectable()
export class CreateSchoolModalityUseCase {
  constructor(private readonly schoolModalityRepo: ISchoolModalityRepository) {}

  async execute(input: CreateSchoolModalityInput): Promise<SchoolModality> {
    const existing = await this.schoolModalityRepo.findBySchoolAndModality(
      input.schoolId,
      input.modalityId,
      input.organizationId,
    );

    if (existing) {
      throw new ConflictException(
        'SCHOOL_MODALITY_CONFLICT',
        'This modality is already linked to this school',
      );
    }

    const id = uuidv7();

    return this.schoolModalityRepo.create({
      id,
      organizationId: input.organizationId,
      schoolId: input.schoolId,
      modalityId: input.modalityId,
      defaultMonthlyFeeCents: input.defaultMonthlyFeeCents,
      defaultEnrollmentFeeCents: input.defaultEnrollmentFeeCents,
    });
  }
}
