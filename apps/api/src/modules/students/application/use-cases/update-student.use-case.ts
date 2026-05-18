import { Injectable } from '@nestjs/common';

import { SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type Student } from '../../domain/entities/student.entity';
import { type UpdateStudentData, IStudentRepository } from '../ports/student.repository.port';

export interface UpdateStudentInput {
  studentId: string;
  organizationId: string;
  fullName?: string;
  birthDate?: string;
  document?: string | null;
  photoUrl?: string | null;
  medicalNotes?: string | null;
  allergies?: string | null;
  medications?: string | null;
  uniformSize?: string | null;
  emergencyContact?: { name: string; phone: string; relationship: string } | null;
  status?: string;
}

@Injectable()
export class UpdateStudentUseCase {
  constructor(
    private readonly studentRepo: IStudentRepository,
    private readonly searchHash: SearchHashService,
  ) {}

  async execute(input: UpdateStudentInput): Promise<Student> {
    const { studentId, organizationId, ...rest } = input;

    const existing = await this.studentRepo.findById(studentId, organizationId);

    if (!existing) {
      throw new NotFoundException('STUDENT_NOT_FOUND', 'Student not found');
    }

    const data: UpdateStudentData = { ...rest };

    if (rest.fullName !== undefined) {
      data.fullNameSearch = this.searchHash.normalizeText(rest.fullName);
    }

    if (rest.document !== undefined) {
      data.documentSearch = rest.document ? this.searchHash.hash(rest.document) : null;
    }

    return this.studentRepo.update(studentId, organizationId, data);
  }
}
