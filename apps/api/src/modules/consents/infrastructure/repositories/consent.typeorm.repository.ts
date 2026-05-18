import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { type CreateConsentData, IConsentRepository } from '../../application/ports/consent.repository.port';
import { Consent } from '../../domain/entities/consent.entity';

@Injectable()
export class ConsentTypeormRepository implements IConsentRepository {
  constructor(@InjectRepository(Consent) private readonly repo: Repository<Consent>) {}

  async create(data: CreateConsentData): Promise<Consent> {
    const consent = this.repo.create({
      id: data.id,
      organizationId: data.organizationId,
      guardianId: data.guardianId,
      studentId: data.studentId ?? null,
      termsVersion: data.termsVersion,
      ip: data.ip,
      userAgent: data.userAgent ?? null,
      grantedFor: data.grantedFor,
      revokedAt: data.revokedAt ?? null,
    });
    return this.repo.save(consent);
  }

  async findByGuardian(guardianId: string, organizationId: string): Promise<Consent[]> {
    return this.repo.find({ where: { guardianId, organizationId } });
  }

  async findByStudent(studentId: string, organizationId: string): Promise<Consent[]> {
    return this.repo.find({ where: { studentId, organizationId } });
  }
}
