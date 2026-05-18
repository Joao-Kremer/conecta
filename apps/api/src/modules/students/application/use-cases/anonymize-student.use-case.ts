import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IStudentRepository } from '../ports/student.repository.port';

export interface AnonymizeStudentInput {
  studentId: string;
  organizationId: string;
}

// LGPD right-to-be-forgotten. Permission `student:anonymize` (ADMIN only).
@Injectable()
export class AnonymizeStudentUseCase {
  constructor(private readonly studentRepo: IStudentRepository) {}

  async execute(input: AnonymizeStudentInput): Promise<void> {
    const student = await this.studentRepo.findById(input.studentId, input.organizationId);
    if (!student) {
      throw new NotFoundException('STUDENT_NOT_FOUND', 'Student not found');
    }
    await this.studentRepo.anonymize(input.studentId, input.organizationId);
  }
}
