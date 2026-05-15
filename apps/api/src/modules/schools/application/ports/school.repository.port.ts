import { type School } from '../../domain/entities/school.entity';

export interface CreateSchoolData {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  address?: Record<string, unknown> | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
}

export interface UpdateSchoolData {
  name?: string;
  address?: Record<string, unknown> | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
}

export abstract class ISchoolRepository {
  abstract findById(id: string, organizationId: string): Promise<School | null>;
  abstract findAll(organizationId: string, schoolIds?: string[]): Promise<School[]>;
  abstract countBySlugPrefix(organizationId: string, slug: string): Promise<number>;
  abstract create(data: CreateSchoolData): Promise<School>;
  abstract update(id: string, organizationId: string, data: UpdateSchoolData): Promise<School>;
  abstract softDelete(id: string, organizationId: string): Promise<void>;
}
