import { type Modality } from '../../domain/entities/modality.entity';

export interface CreateModalityData {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface UpdateModalityData {
  name?: string;
  description?: string | null;
  color?: string | null;
  active?: boolean;
}

export abstract class IModalityRepository {
  abstract findById(id: string, organizationId: string): Promise<Modality | null>;
  abstract findAll(organizationId: string): Promise<Modality[]>;
  abstract findByName(organizationId: string, name: string): Promise<Modality | null>;
  abstract create(data: CreateModalityData): Promise<Modality>;
  abstract update(id: string, organizationId: string, data: UpdateModalityData): Promise<Modality>;
  abstract softDelete(id: string, organizationId: string): Promise<void>;
}
