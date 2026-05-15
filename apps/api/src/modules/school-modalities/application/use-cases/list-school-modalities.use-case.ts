import { Injectable } from '@nestjs/common';

import { type SchoolModality } from '../../domain/entities/school-modality.entity';
import { ISchoolModalityRepository } from '../ports/school-modality.repository.port';

export interface ListSchoolModalitiesInput {
  organizationId: string;
  schoolId?: string;
}

@Injectable()
export class ListSchoolModalitiesUseCase {
  constructor(private readonly schoolModalityRepo: ISchoolModalityRepository) {}

  async execute(input: ListSchoolModalitiesInput): Promise<SchoolModality[]> {
    return this.schoolModalityRepo.findAll(input.organizationId, input.schoolId);
  }
}
