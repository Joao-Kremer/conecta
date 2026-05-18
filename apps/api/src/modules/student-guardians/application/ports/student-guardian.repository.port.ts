import { type StudentGuardian } from '../../domain/entities/student-guardian.entity';

export interface CreateStudentGuardianData {
  id: string;
  organizationId: string;
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimaryPayer: boolean;
  receivesCommunications: boolean;
  isEmergencyContact: boolean;
}

export interface UpdateStudentGuardianData {
  relationship?: string;
  isPrimaryPayer?: boolean;
  receivesCommunications?: boolean;
  isEmergencyContact?: boolean;
}

export abstract class IStudentGuardianRepository {
  abstract findById(id: string, organizationId: string): Promise<StudentGuardian | null>;
  abstract findByStudent(studentId: string, organizationId: string): Promise<StudentGuardian[]>;
  abstract findByGuardian(guardianId: string, organizationId: string): Promise<StudentGuardian[]>;
  abstract findLink(
    studentId: string,
    guardianId: string,
    organizationId: string,
  ): Promise<StudentGuardian | null>;
  abstract create(data: CreateStudentGuardianData): Promise<StudentGuardian>;
  abstract update(
    id: string,
    organizationId: string,
    data: UpdateStudentGuardianData,
  ): Promise<StudentGuardian>;
  abstract delete(id: string, organizationId: string): Promise<void>;
}
