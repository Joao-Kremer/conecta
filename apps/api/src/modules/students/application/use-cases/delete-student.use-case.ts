import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IStudentRepository } from '../ports/student.repository.port';

export interface DeleteStudentInput {
  studentId: string;
  organizationId: string;
}

@Injectable()
export class DeleteStudentUseCase {
  constructor(private readonly studentRepo: IStudentRepository) {}

  async execute(input: DeleteStudentInput): Promise<void> {
    const existing = await this.studentRepo.findById(input.studentId, input.organizationId);

    if (!existing) {
      throw new NotFoundException('STUDENT_NOT_FOUND', 'Student not found');
    }

    await this.studentRepo.softDelete(input.studentId, input.organizationId);
  }
}
