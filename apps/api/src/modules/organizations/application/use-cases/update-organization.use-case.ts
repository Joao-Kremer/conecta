import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IOrganizationRepository } from '../ports/organization.repository.port';

export interface UpdateOrganizationInput {
  organizationId: string;
  name?: string;
  logoUrl?: string | null;
  settings?: Record<string, unknown>;
}

export interface UpdateOrganizationOutput {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  settings: Record<string, unknown>;
  plan: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(input: UpdateOrganizationInput): Promise<UpdateOrganizationOutput> {
    const { organizationId, ...data } = input;

    const existing = await this.orgRepo.findById(organizationId);

    if (!existing) {
      throw new NotFoundException('ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    const org = await this.orgRepo.update(organizationId, data);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl ?? null,
      settings: org.settings,
      plan: org.plan,
      status: org.status,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
