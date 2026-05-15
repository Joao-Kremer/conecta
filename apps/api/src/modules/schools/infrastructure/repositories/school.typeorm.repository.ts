import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  ISchoolRepository,
  type CreateSchoolData,
  type UpdateSchoolData,
} from '../../application/ports/school.repository.port';
import { School } from '../../domain/entities/school.entity';

@Injectable()
export class SchoolTypeormRepository implements ISchoolRepository {
  constructor(
    @InjectRepository(School) private readonly repo: Repository<School>,
  ) {}

  async findById(id: string, organizationId: string): Promise<School | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findAll(organizationId: string, schoolIds?: string[]): Promise<School[]> {
    if (schoolIds && schoolIds.length > 0) {
      return this.repo.find({ where: { organizationId, id: In(schoolIds) } });
    }
    return this.repo.find({ where: { organizationId } });
  }

  async countBySlugPrefix(organizationId: string, slug: string): Promise<number> {
    return this.repo
      .createQueryBuilder('school')
      .where('school.organization_id = :organizationId', { organizationId })
      .andWhere('school.slug LIKE :slug', { slug: `${slug}%` })
      .getCount();
  }

  async create(data: CreateSchoolData): Promise<School> {
    const school = this.repo.create({
      id: data.id,
      organizationId: data.organizationId,
      name: data.name,
      slug: data.slug,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      timezone: data.timezone ?? 'America/Sao_Paulo',
    });
    return this.repo.save(school);
  }

  async update(id: string, organizationId: string, data: UpdateSchoolData): Promise<School> {
    const school = await this.repo.findOneOrFail({ where: { id, organizationId } });
    return this.repo.save(Object.assign(school, data));
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repo.softDelete({ id, organizationId });
  }
}
