import { type Guardian } from '../../domain/entities/guardian.entity';

export interface CreateGuardianData {
  id: string;
  organizationId: string;
  fullName: string;
  fullNameSearch: string;
  document?: string | null;
  documentSearch?: string | null;
  phone: string;
  phoneSearch: string;
  email: string;
  address?: Record<string, unknown> | null;
  userId?: string | null;
}

export interface UpdateGuardianData {
  fullName?: string;
  fullNameSearch?: string;
  document?: string | null;
  documentSearch?: string | null;
  phone?: string;
  phoneSearch?: string;
  email?: string;
  address?: Record<string, unknown> | null;
  userId?: string | null;
}

export abstract class IGuardianRepository {
  abstract findById(id: string, organizationId: string): Promise<Guardian | null>;
  abstract findAll(organizationId: string): Promise<Guardian[]>;
  abstract findByIds(ids: string[], organizationId: string): Promise<Guardian[]>;
  abstract findByEmail(email: string, organizationId: string): Promise<Guardian | null>;
  abstract create(data: CreateGuardianData): Promise<Guardian>;
  abstract update(id: string, organizationId: string, data: UpdateGuardianData): Promise<Guardian>;
  abstract softDelete(id: string, organizationId: string): Promise<void>;
}
