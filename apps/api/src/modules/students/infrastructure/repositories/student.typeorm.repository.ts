import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  IStudentRepository,
  type CreateStudentData,
  type UpdateStudentData,
} from '../../application/ports/student.repository.port';
import { Student } from '../../domain/entities/student.entity';

@Injectable()
export class StudentTypeormRepository implements IStudentRepository {
  constructor(
    @InjectRepository(Student) private readonly repo: Repository<Student>,
  ) {}

  async findById(id: string, organizationId: string): Promise<Student | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findAll(
    organizationId: string,
    opts?: { search?: string; status?: string },
  ): Promise<Student[]> {
    const qb = this.repo
      .createQueryBuilder('student')
      .where('student.organization_id = :organizationId', { organizationId });

    if (opts?.search) {
      qb.andWhere("student.full_name_search LIKE :search || '%'", { search: opts.search });
    }

    if (opts?.status) {
      qb.andWhere('student.status = :status', { status: opts.status });
    }

    return qb.getMany();
  }

  async findByIds(ids: string[], organizationId: string): Promise<Student[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repo.find({ where: { organizationId, id: In(ids) } });
  }

  async searchByName(organizationId: string, normalizedQuery: string): Promise<Student[]> {
    return this.repo
      .createQueryBuilder('student')
      .where('student.organization_id = :organizationId', { organizationId })
      .andWhere("student.full_name_search LIKE :q || '%'", { q: normalizedQuery })
      .getMany();
  }

  async create(data: CreateStudentData): Promise<Student> {
    const student = this.repo.create({
      id: data.id,
      organizationId: data.organizationId,
      fullName: data.fullName,
      fullNameSearch: data.fullNameSearch,
      birthDate: data.birthDate,
      document: data.document ?? null,
      documentSearch: data.documentSearch ?? null,
      photoUrl: data.photoUrl ?? null,
      medicalNotes: data.medicalNotes ?? null,
      allergies: data.allergies ?? null,
      medications: data.medications ?? null,
      uniformSize: data.uniformSize ?? null,
      emergencyContact: data.emergencyContact ?? null,
      status: data.status ?? 'ACTIVE',
    });
    return this.repo.save(student);
  }

  async update(id: string, organizationId: string, data: UpdateStudentData): Promise<Student> {
    const student = await this.repo.findOneOrFail({ where: { id, organizationId } });
    return this.repo.save(Object.assign(student, data));
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repo.softDelete({ id, organizationId });
  }

  // LGPD right-to-be-forgotten: replace PII with placeholders (kept reversible
  // through the transformer so reads stay valid), clear search columns, stamp
  // anonymized_at, then soft-delete. IDs/FKs/timestamps are preserved.
  async anonymize(id: string, organizationId: string): Promise<void> {
    const placeholder = '***ANONYMIZED***';
    const student = await this.repo.findOne({ where: { id, organizationId } });
    if (!student) return;
    student.fullName = placeholder;
    student.document = placeholder;
    student.medicalNotes = placeholder;
    student.allergies = placeholder;
    student.medications = placeholder;
    student.fullNameSearch = placeholder;
    student.documentSearch = null;
    student.photoUrl = null;
    student.emergencyContact = null;
    student.status = 'INACTIVE';
    student.anonymizedAt = new Date();
    await this.repo.save(student);
    await this.repo.softDelete({ id, organizationId });
  }
}
