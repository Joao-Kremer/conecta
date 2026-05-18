import { Injectable } from '@nestjs/common';

import { type ConsentPurpose } from '../../domain/entities/consent.entity';
import { IConsentRepository } from '../ports/consent.repository.port';

export interface HasActiveConsentInput {
  organizationId: string;
  guardianId: string;
  purpose: ConsentPurpose;
  studentId?: string | null;
}

@Injectable()
export class HasActiveConsentUseCase {
  constructor(private readonly consentRepo: IConsentRepository) {}

  async execute(input: HasActiveConsentInput): Promise<boolean> {
    const rows = await this.consentRepo.findByGuardian(input.guardianId, input.organizationId);

    // Guardian-level rows (studentId null) apply to every dependent; rows tied
    // to a specific student apply only to that student. Latest event wins.
    const relevant = rows
      .filter(
        (r) =>
          r.grantedFor.includes(input.purpose) &&
          (r.studentId == null || r.studentId === (input.studentId ?? r.studentId)),
      )
      .sort((a, b) => a.acceptedAt.getTime() - b.acceptedAt.getTime());

    let active = false;
    for (const row of relevant) {
      active = row.revokedAt == null;
    }
    return active;
  }
}
