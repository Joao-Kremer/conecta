import { Injectable } from '@nestjs/common';

import { type School } from '../../domain/entities/school.entity';
import { ISchoolRepository } from '../ports/school.repository.port';

export interface ListSchoolsInput {
  organizationId: string;
  scopedSchoolIds?: string[];
}

@Injectable()
export class ListSchoolsUseCase {
  constructor(private readonly schoolRepo: ISchoolRepository) {}

  async execute(input: ListSchoolsInput): Promise<School[]> {
    return this.schoolRepo.findAll(input.organizationId, input.scopedSchoolIds);
  }
}
