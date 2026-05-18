import { type Student } from '../../domain/entities/student.entity';

export interface CreateStudentData {
  id: string;
  organizationId: string;
  fullName: string;
  fullNameSearch: string;
  birthDate: string;
  document?: string | null;
  documentSearch?: string | null;
  photoUrl?: string | null;
  medicalNotes?: string | null;
  allergies?: string | null;
  medications?: string | null;
  uniformSize?: string | null;
  emergencyContact?: { name: string; phone: string; relationship: string } | null;
  status?: string;
}

export interface UpdateStudentData {
  fullName?: string;
  fullNameSearch?: string;
  birthDate?: string;
  document?: string | null;
  documentSearch?: string | null;
  photoUrl?: string | null;
  medicalNotes?: string | null;
  allergies?: string | null;
  medications?: string | null;
  uniformSize?: string | null;
  emergencyContact?: { name: string; phone: string; relationship: string } | null;
  status?: string;
}

export abstract class IStudentRepository {
  abstract findById(id: string, organizationId: string): Promise<Student | null>;
  abstract findAll(
    organizationId: string,
    opts?: { search?: string; status?: string },
  ): Promise<Student[]>;
  abstract findByIds(ids: string[], organizationId: string): Promise<Student[]>;
  abstract searchByName(organizationId: string, normalizedQuery: string): Promise<Student[]>;
  abstract create(data: CreateStudentData): Promise<Student>;
  abstract update(id: string, organizationId: string, data: UpdateStudentData): Promise<Student>;
  abstract softDelete(id: string, organizationId: string): Promise<void>;
  abstract anonymize(id: string, organizationId: string): Promise<void>;
}
