import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

export interface UpdateStudentGuardianInput {
  id: string;
  organizationId: string;
  relationship?: string;
  isPrimaryPayer?: boolean;
  receivesCommunications?: boolean;
  isEmergencyContact?: boolean;
}

@Injectable()
export class UpdateStudentGuardianUseCase {
  constructor(private readonly studentGuardianRepo: IStudentGuardianRepository) {}

  async execute(input: UpdateStudentGuardianInput): Promise<StudentGuardian> {
    const { id, organizationId, ...data } = input;

    const existing = await this.studentGuardianRepo.findById(id, organizationId);

    if (!existing) {
      throw new NotFoundException('STUDENT_GUARDIAN_NOT_FOUND', 'Student-guardian link not found');
    }

    return this.studentGuardianRepo.update(id, organizationId, data);
  }
}
