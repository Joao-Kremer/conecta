import { Injectable } from '@nestjs/common';

import { type Consent } from '../../domain/entities/consent.entity';
import { IConsentRepository } from '../ports/consent.repository.port';

export interface ListConsentsInput {
  organizationId: string;
  guardianId?: string;
  studentId?: string;
}

@Injectable()
export class ListConsentsUseCase {
  constructor(private readonly consentRepo: IConsentRepository) {}

  async execute(input: ListConsentsInput): Promise<Consent[]> {
    if (input.studentId) {
      return this.consentRepo.findByStudent(input.studentId, input.organizationId);
    }
    if (input.guardianId) {
      return this.consentRepo.findByGuardian(input.guardianId, input.organizationId);
    }
    return [];
  }
}
