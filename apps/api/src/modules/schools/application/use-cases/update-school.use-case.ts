import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type School } from '../../domain/entities/school.entity';
import { ISchoolRepository } from '../ports/school.repository.port';

export interface UpdateSchoolInput {
  schoolId: string;
  organizationId: string;
  name?: string;
  address?: Record<string, unknown> | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
}

@Injectable()
export class UpdateSchoolUseCase {
  constructor(private readonly schoolRepo: ISchoolRepository) {}

  async execute(input: UpdateSchoolInput): Promise<School> {
    const { schoolId, organizationId, ...data } = input;

    const existing = await this.schoolRepo.findById(schoolId, organizationId);

    if (!existing) {
      throw new NotFoundException('SCHOOL_NOT_FOUND', 'School not found');
    }

    return this.schoolRepo.update(schoolId, organizationId, data);
  }
}
