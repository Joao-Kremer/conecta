import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  IOrganizationRepository,
  type UpdateOrganizationData,
} from '../../application/ports/organization.repository.port';
import { Organization } from '../../domain/entities/organization.entity';

@Injectable()
export class OrganizationTypeormRepository implements IOrganizationRepository {
  constructor(
    @InjectRepository(Organization) private readonly repo: Repository<Organization>,
  ) {}

  async findById(id: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, data: UpdateOrganizationData): Promise<Organization> {
    const org = await this.repo.findOneOrFail({ where: { id } });
    return this.repo.save(Object.assign(org, data));
  }
}
