import { type SchoolModality } from '../../domain/entities/school-modality.entity';

export interface CreateSchoolModalityData {
  id: string;
  organizationId: string;
  schoolId: string;
  modalityId: string;
  defaultMonthlyFeeCents: number;
  defaultEnrollmentFeeCents?: number;
}

export interface UpdateSchoolModalityData {
  defaultMonthlyFeeCents?: number;
  defaultEnrollmentFeeCents?: number;
  active?: boolean;
}

export abstract class ISchoolModalityRepository {
  abstract findById(id: string, organizationId: string): Promise<SchoolModality | null>;
  abstract findAll(organizationId: string, schoolId?: string): Promise<SchoolModality[]>;
  abstract findBySchoolAndModality(
    schoolId: string,
    modalityId: string,
    organizationId: string,
  ): Promise<SchoolModality | null>;
  abstract create(data: CreateSchoolModalityData): Promise<SchoolModality>;
  abstract update(
    id: string,
    organizationId: string,
    data: UpdateSchoolModalityData,
  ): Promise<SchoolModality>;
  abstract remove(id: string, organizationId: string): Promise<void>;
}
