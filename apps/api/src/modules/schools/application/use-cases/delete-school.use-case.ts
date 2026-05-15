import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { ISchoolRepository } from '../ports/school.repository.port';

export interface DeleteSchoolInput {
  schoolId: string;
  organizationId: string;
}

@Injectable()
export class DeleteSchoolUseCase {
  constructor(private readonly schoolRepo: ISchoolRepository) {}

  async execute(input: DeleteSchoolInput): Promise<void> {
    const existing = await this.schoolRepo.findById(input.schoolId, input.organizationId);

    if (!existing) {
      throw new NotFoundException('SCHOOL_NOT_FOUND', 'School not found');
    }

    await this.schoolRepo.softDelete(input.schoolId, input.organizationId);
  }
}
