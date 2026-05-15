import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { type School } from '../../domain/entities/school.entity';
import { ISchoolRepository } from '../ports/school.repository.port';

export interface CreateSchoolInput {
  organizationId: string;
  name: string;
  address?: Record<string, unknown> | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class CreateSchoolUseCase {
  constructor(private readonly schoolRepo: ISchoolRepository) {}

  async execute(input: CreateSchoolInput): Promise<School> {
    const id = uuidv7();
    const baseSlug = generateSlug(input.name) || 'school';

    const count = await this.schoolRepo.countBySlugPrefix(input.organizationId, baseSlug);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

    if (slug.length > 200) {
      throw new ConflictException('SCHOOL_SLUG_CONFLICT', 'Could not generate a unique slug for this school name');
    }

    return this.schoolRepo.create({
      id,
      organizationId: input.organizationId,
      name: input.name,
      slug,
      address: input.address,
      phone: input.phone,
      email: input.email,
      timezone: input.timezone,
    });
  }
}
