import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { UnprocessableException } from '../../../../shared/exceptions/domain.exception';
import { type Consent, type ConsentPurpose } from '../../domain/entities/consent.entity';
import { IConsentRepository } from '../ports/consent.repository.port';

export interface RecordConsentInput {
  organizationId: string;
  guardianId: string;
  studentId?: string | null;
  termsVersion: string;
  ip: string;
  userAgent?: string | null;
  grantedFor: ConsentPurpose[];
}

@Injectable()
export class RecordConsentUseCase {
  constructor(private readonly consentRepo: IConsentRepository) {}

  async execute(input: RecordConsentInput): Promise<Consent> {
    if (input.grantedFor.length === 0) {
      throw new UnprocessableException('CONSENT_EMPTY', 'A consent must grant at least one purpose');
    }
    return this.consentRepo.create({
      id: uuidv7(),
      organizationId: input.organizationId,
      guardianId: input.guardianId,
      studentId: input.studentId ?? null,
      termsVersion: input.termsVersion,
      ip: input.ip,
      userAgent: input.userAgent ?? null,
      grantedFor: input.grantedFor,
      revokedAt: null,
    });
  }
}
