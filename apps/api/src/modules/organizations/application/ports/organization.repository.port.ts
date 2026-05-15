import { type Organization } from '../../domain/entities/organization.entity';

export interface UpdateOrganizationData {
  name?: string;
  logoUrl?: string | null;
  settings?: Record<string, unknown>;
}

export abstract class IOrganizationRepository {
  abstract findById(id: string): Promise<Organization | null>;
  abstract update(id: string, data: UpdateOrganizationData): Promise<Organization>;
}
