import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

export interface UnlinkGuardianFromStudentInput {
  id: string;
  organizationId: string;
}

@Injectable()
export class UnlinkGuardianFromStudentUseCase {
  constructor(private readonly studentGuardianRepo: IStudentGuardianRepository) {}

  async execute(input: UnlinkGuardianFromStudentInput): Promise<void> {
    const existing = await this.studentGuardianRepo.findById(input.id, input.organizationId);

    if (!existing) {
      throw new NotFoundException('STUDENT_GUARDIAN_NOT_FOUND', 'Student-guardian link not found');
    }

    await this.studentGuardianRepo.delete(input.id, input.organizationId);
  }
}
