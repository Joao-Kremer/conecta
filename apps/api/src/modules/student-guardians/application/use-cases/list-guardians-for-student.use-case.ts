import { Injectable } from '@nestjs/common';

import { type StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

export interface ListGuardiansForStudentInput {
  organizationId: string;
  studentId: string;
}

@Injectable()
export class ListGuardiansForStudentUseCase {
  constructor(private readonly studentGuardianRepo: IStudentGuardianRepository) {}

  async execute(input: ListGuardiansForStudentInput): Promise<StudentGuardian[]> {
    return this.studentGuardianRepo.findByStudent(input.studentId, input.organizationId);
  }
}
