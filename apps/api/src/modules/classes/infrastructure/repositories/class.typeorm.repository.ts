import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  IClassRepository,
  type CreateClassData,
  type UpdateClassData,
} from '../../application/ports/class.repository.port';
import { ClassEntity } from '../../domain/entities/class.entity';

@Injectable()
export class ClassTypeormRepository implements IClassRepository {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly repo: Repository<ClassEntity>,
  ) {}

  async findById(id: string, organizationId: string): Promise<ClassEntity | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findAll(
    organizationId: string,
    filters?: { schoolId?: string; schoolModalityId?: string },
  ): Promise<ClassEntity[]> {
    const where: Record<string, string> = { organizationId };
    if (filters?.schoolId) {
      where['schoolId'] = filters.schoolId;
    }
    if (filters?.schoolModalityId) {
      where['schoolModalityId'] = filters.schoolModalityId;
    }
    return this.repo.find({ where });
  }

  async create(data: CreateClassData): Promise<ClassEntity> {
    const entity = this.repo.create({
      id: data.id,
      organizationId: data.organizationId,
      schoolId: data.schoolId,
      schoolModalityId: data.schoolModalityId,
      name: data.name,
      ageGroup: data.ageGroup,
      schedule: data.schedule,
      location: data.location,
      capacity: data.capacity,
      monthlyFeeCents: data.monthlyFeeCents,
    });
    return this.repo.save(entity);
  }

  async update(id: string, organizationId: string, data: UpdateClassData): Promise<ClassEntity> {
    const entity = await this.repo.findOneOrFail({ where: { id, organizationId } });
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repo.softDelete({ id, organizationId });
  }
}
