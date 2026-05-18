import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type Student } from '../../domain/entities/student.entity';
import { IStudentRepository } from '../ports/student.repository.port';

export interface FindStudentInput {
  studentId: string;
  organizationId: string;
}

@Injectable()
export class FindStudentUseCase {
  constructor(private readonly studentRepo: IStudentRepository) {}

  async execute(input: FindStudentInput): Promise<Student> {
    const student = await this.studentRepo.findById(input.studentId, input.organizationId);

    if (!student) {
      throw new NotFoundException('STUDENT_NOT_FOUND', 'Student not found');
    }

    return student;
  }
}
