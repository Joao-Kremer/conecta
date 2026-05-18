import { Injectable } from '@nestjs/common';

import { type StudentGuardian } from '../../domain/entities/student-guardian.entity';
import { IStudentGuardianRepository } from '../ports/student-guardian.repository.port';

export interface ListStudentsForGuardianInput {
  organizationId: string;
  guardianId: string;
}

@Injectable()
export class ListStudentsForGuardianUseCase {
  constructor(private readonly studentGuardianRepo: IStudentGuardianRepository) {}

  async execute(input: ListStudentsForGuardianInput): Promise<StudentGuardian[]> {
    return this.studentGuardianRepo.findByGuardian(input.guardianId, input.organizationId);
  }
}
