import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IOrganizationRepository } from '../ports/organization.repository.port';

export interface FindOrganizationInput {
  organizationId: string;
}

export interface FindOrganizationOutput {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  settings: Record<string, unknown>;
  plan: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class FindOrganizationUseCase {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(input: FindOrganizationInput): Promise<FindOrganizationOutput> {
    const org = await this.orgRepo.findById(input.organizationId);

    if (!org) {
      throw new NotFoundException('ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl ?? null,
      settings: org.settings,
      plan: org.plan,
      status: org.status,
      createdAt: org.createdAt,
    };
  }
}
