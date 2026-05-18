import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  IStudentGuardianRepository,
  type CreateStudentGuardianData,
  type UpdateStudentGuardianData,
} from '../../application/ports/student-guardian.repository.port';
import { StudentGuardian } from '../../domain/entities/student-guardian.entity';

@Injectable()
export class StudentGuardianTypeormRepository implements IStudentGuardianRepository {
  constructor(
    @InjectRepository(StudentGuardian) private readonly repo: Repository<StudentGuardian>,
  ) {}

  async findById(id: string, organizationId: string): Promise<StudentGuardian | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findByStudent(studentId: string, organizationId: string): Promise<StudentGuardian[]> {
    return this.repo.find({ where: { studentId, organizationId } });
  }

  async findByGuardian(guardianId: string, organizationId: string): Promise<StudentGuardian[]> {
    return this.repo.find({ where: { guardianId, organizationId } });
  }

  async findLink(
    studentId: string,
    guardianId: string,
    organizationId: string,
  ): Promise<StudentGuardian | null> {
    return this.repo.findOne({ where: { studentId, guardianId, organizationId } });
  }

  async create(data: CreateStudentGuardianData): Promise<StudentGuardian> {
    const link = this.repo.create({
      id: data.id,
      organizationId: data.organizationId,
      studentId: data.studentId,
      guardianId: data.guardianId,
      relationship: data.relationship,
      isPrimaryPayer: data.isPrimaryPayer,
      receivesCommunications: data.receivesCommunications,
      isEmergencyContact: data.isEmergencyContact,
    });
    return this.repo.save(link);
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateStudentGuardianData,
  ): Promise<StudentGuardian> {
    const link = await this.repo.findOneOrFail({ where: { id, organizationId } });
    return this.repo.save(Object.assign(link, data));
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repo.delete({ id, organizationId });
  }
}
