import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ICoachClassRepository } from '../../application/ports/coach-class.repository.port';
import { CoachClass } from '../../domain/entities/coach-class.entity';

@Injectable()
export class CoachClassTypeormRepository implements ICoachClassRepository {
  constructor(
    @InjectRepository(CoachClass)
    private readonly repo: Repository<CoachClass>,
  ) {}

  async assign(classId: string, userId: string, organizationId: string): Promise<CoachClass> {
    const entity = this.repo.create({ classId, userId, organizationId });
    return this.repo.save(entity);
  }

  async remove(classId: string, userId: string, organizationId: string): Promise<void> {
    await this.repo.delete({ classId, userId, organizationId });
  }

  async findByClass(classId: string, organizationId: string): Promise<CoachClass[]> {
    return this.repo.find({ where: { classId, organizationId } });
  }

  async exists(classId: string, userId: string, organizationId: string): Promise<boolean> {
    return this.repo.existsBy({ classId, userId, organizationId });
  }
}
