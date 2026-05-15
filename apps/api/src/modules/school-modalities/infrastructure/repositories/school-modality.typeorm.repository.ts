import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ISchoolModalityRepository,
  type CreateSchoolModalityData,
  type UpdateSchoolModalityData,
} from '../../application/ports/school-modality.repository.port';
import { SchoolModality } from '../../domain/entities/school-modality.entity';

@Injectable()
export class SchoolModalityTypeormRepository implements ISchoolModalityRepository {
  constructor(
    @InjectRepository(SchoolModality)
    private readonly repo: Repository<SchoolModality>,
  ) {}

  async findById(id: string, organizationId: string): Promise<SchoolModality | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findAll(organizationId: string, schoolId?: string): Promise<SchoolModality[]> {
    const where: Record<string, string> = { organizationId };
    if (schoolId) {
      where['schoolId'] = schoolId;
    }
    return this.repo.find({ where });
  }

  async findBySchoolAndModality(
    schoolId: string,
    modalityId: string,
    organizationId: string,
  ): Promise<SchoolModality | null> {
    return this.repo.findOne({ where: { schoolId, modalityId, organizationId } });
  }

  async create(data: CreateSchoolModalityData): Promise<SchoolModality> {
    const entity = this.repo.create({
      id: data.id,
      organizationId: data.organizationId,
      schoolId: data.schoolId,
      modalityId: data.modalityId,
      defaultMonthlyFeeCents: data.defaultMonthlyFeeCents,
      defaultEnrollmentFeeCents: data.defaultEnrollmentFeeCents ?? 0,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateSchoolModalityData,
  ): Promise<SchoolModality> {
    const entity = await this.repo.findOneOrFail({ where: { id, organizationId } });
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.repo.delete({ id, organizationId });
  }
}
