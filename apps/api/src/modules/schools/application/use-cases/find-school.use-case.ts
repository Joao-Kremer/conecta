import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type School } from '../../domain/entities/school.entity';
import { ISchoolRepository } from '../ports/school.repository.port';

export interface FindSchoolInput {
  schoolId: string;
  organizationId: string;
}

@Injectable()
export class FindSchoolUseCase {
  constructor(private readonly schoolRepo: ISchoolRepository) {}

  async execute(input: FindSchoolInput): Promise<School> {
    const school = await this.schoolRepo.findById(input.schoolId, input.organizationId);

    if (!school) {
      throw new NotFoundException('SCHOOL_NOT_FOUND', 'School not found');
    }

    return school;
  }
}
