import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { UnprocessableException } from '../../../../shared/exceptions/domain.exception';
import { type Consent, type ConsentPurpose } from '../../domain/entities/consent.entity';
import { IConsentRepository } from '../ports/consent.repository.port';

export interface RevokeConsentInput {
  organizationId: string;
  guardianId: string;
  studentId?: string | null;
  termsVersion?: string;
  ip: string;
  userAgent?: string | null;
  purposes: ConsentPurpose[];
}

// Revocation is append-only: a NEW row with `revokedAt` set. The original
// consent row is never edited. See 04-SECURITY_AND_LGPD.
@Injectable()
export class RevokeConsentUseCase {
  constructor(private readonly consentRepo: IConsentRepository) {}

  async execute(input: RevokeConsentInput): Promise<Consent> {
    if (input.purposes.length === 0) {
      throw new UnprocessableException('CONSENT_EMPTY', 'A revocation must target at least one purpose');
    }
    return this.consentRepo.create({
      id: uuidv7(),
      organizationId: input.organizationId,
      guardianId: input.guardianId,
      studentId: input.studentId ?? null,
      termsVersion: input.termsVersion ?? 'revocation',
      ip: input.ip,
      userAgent: input.userAgent ?? null,
      grantedFor: input.purposes,
      revokedAt: new Date(),
    });
  }
}
