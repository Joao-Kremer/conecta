import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { type Student } from '../../domain/entities/student.entity';
import { IStudentRepository } from '../ports/student.repository.port';

export interface CreateStudentInput {
  organizationId: string;
  fullName: string;
  birthDate: string;
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
export class CreateStudentUseCase {
  constructor(
    private readonly studentRepo: IStudentRepository,
    private readonly searchHash: SearchHashService,
  ) {}

  async execute(input: CreateStudentInput): Promise<Student> {
    const id = uuidv7();

    const fullNameSearch = this.searchHash.normalizeText(input.fullName);
    const documentSearch = input.document ? this.searchHash.hash(input.document) : undefined;

    return this.studentRepo.create({
      id,
      organizationId: input.organizationId,
      fullName: input.fullName,
      fullNameSearch,
      birthDate: input.birthDate,
      document: input.document,
      documentSearch,
      photoUrl: input.photoUrl,
      medicalNotes: input.medicalNotes,
      allergies: input.allergies,
      medications: input.medications,
      uniformSize: input.uniformSize,
      emergencyContact: input.emergencyContact,
      status: input.status ?? 'ACTIVE',
    });
  }
}
