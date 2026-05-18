import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { type StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

export interface LinkGuardianToStudentInput {
  organizationId: string;
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimaryPayer?: boolean;
  receivesCommunications?: boolean;
  isEmergencyContact?: boolean;
}

@Injectable()
export class LinkGuardianToStudentUseCase {
  constructor(private readonly studentGuardianRepo: IStudentGuardianRepository) {}

  async execute(input: LinkGuardianToStudentInput): Promise<StudentGuardian> {
    const existing = await this.studentGuardianRepo.findLink(
      input.studentId,
      input.guardianId,
      input.organizationId,
    );

    if (existing) {
      throw new ConflictException(
        'STUDENT_GUARDIAN_ALREADY_LINKED',
        'This guardian is already linked to this student',
      );
    }

    return this.studentGuardianRepo.create({
      id: uuidv7(),
      organizationId: input.organizationId,
      studentId: input.studentId,
      guardianId: input.guardianId,
      relationship: input.relationship,
      isPrimaryPayer: input.isPrimaryPayer ?? false,
      receivesCommunications: input.receivesCommunications ?? true,
      isEmergencyContact: input.isEmergencyContact ?? false,
    });
  }
}
