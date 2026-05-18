import { type Consent, type ConsentPurpose } from '../../domain/entities/consent.entity';

export interface CreateConsentData {
  id: string;
  organizationId: string;
  guardianId: string;
  studentId?: string | null;
  termsVersion: string;
  ip: string;
  userAgent?: string | null;
  grantedFor: ConsentPurpose[];
  revokedAt?: Date | null;
}

export abstract class IConsentRepository {
  abstract create(data: CreateConsentData): Promise<Consent>;
  abstract findByGuardian(guardianId: string, organizationId: string): Promise<Consent[]>;
  abstract findByStudent(studentId: string, organizationId: string): Promise<Consent[]>;
}
