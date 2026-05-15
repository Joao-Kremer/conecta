import { type Organization } from '../../../organizations/domain/entities/organization.entity';

export interface CreateOrganizationInput {
  id: string;
  name: string;
  slug: string;
}

export abstract class IOrganizationRepository {
  abstract create(input: CreateOrganizationInput): Promise<Organization>;
  abstract findById(id: string): Promise<Organization | null>;
  abstract existsBySlug(slug: string): Promise<boolean>;
  abstract countBySlugPrefix(prefix: string): Promise<number>;
}
