import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { type Guardian } from '../../domain/entities/guardian.entity';
import { IGuardianRepository } from '../ports/guardian.repository.port';

export interface CreateGuardianInput {
  organizationId: string;
  fullName: string;
  document?: string | null;
  phone: string;
  email: string;
  address?: Record<string, unknown> | null;
  userId?: string | null;
}

@Injectable()
export class CreateGuardianUseCase {
  constructor(
    private readonly guardianRepo: IGuardianRepository,
    private readonly searchHash: SearchHashService,
  ) {}

  async execute(input: CreateGuardianInput): Promise<Guardian> {
    const id = uuidv7();

    const fullNameSearch = this.searchHash.normalizeText(input.fullName);
    const documentSearch = input.document ? this.searchHash.hash(input.document) : undefined;
    const phoneSearch = this.searchHash.hash(input.phone);

    return this.guardianRepo.create({
      id,
      organizationId: input.organizationId,
      fullName: input.fullName,
      fullNameSearch,
      document: input.document,
      documentSearch,
      phone: input.phone,
      phoneSearch,
      email: input.email,
      address: input.address,
      userId: input.userId,
    });
  }
}
