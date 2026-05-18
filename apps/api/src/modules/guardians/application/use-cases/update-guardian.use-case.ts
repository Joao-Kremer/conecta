import { Injectable } from '@nestjs/common';

import { SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type Guardian } from '../../domain/entities/guardian.entity';
import {
  IGuardianRepository,
  type UpdateGuardianData,
} from '../ports/guardian.repository.port';

export interface UpdateGuardianInput {
  guardianId: string;
  organizationId: string;
  fullName?: string;
  document?: string | null;
  phone?: string;
  email?: string;
  address?: Record<string, unknown> | null;
  userId?: string | null;
}

@Injectable()
export class UpdateGuardianUseCase {
  constructor(
    private readonly guardianRepo: IGuardianRepository,
    private readonly searchHash: SearchHashService,
  ) {}

  async execute(input: UpdateGuardianInput): Promise<Guardian> {
    const { guardianId, organizationId, ...rest } = input;

    const existing = await this.guardianRepo.findById(guardianId, organizationId);

    if (!existing) {
      throw new NotFoundException('GUARDIAN_NOT_FOUND', 'Guardian not found');
    }

    const data: UpdateGuardianData = { ...rest };

    if (rest.fullName !== undefined) {
      data.fullNameSearch = this.searchHash.normalizeText(rest.fullName);
    }

    if (rest.document !== undefined) {
      data.documentSearch = rest.document ? this.searchHash.hash(rest.document) : null;
    }

    if (rest.phone !== undefined) {
      data.phoneSearch = this.searchHash.hash(rest.phone);
    }

    return this.guardianRepo.update(guardianId, organizationId, data);
  }
}
