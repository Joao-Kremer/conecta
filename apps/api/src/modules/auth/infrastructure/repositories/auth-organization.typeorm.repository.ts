import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { Organization } from '../../../organizations/domain/entities/organization.entity';
import {
  type CreateOrganizationInput,
  type IOrganizationRepository,
} from '../../application/ports/organization.repository.port';

@Injectable()
export class AuthOrganizationTypeormRepository implements IOrganizationRepository {
  constructor(
    @InjectRepository(Organization) private readonly repo: Repository<Organization>,
  ) {}

  async create(input: CreateOrganizationInput): Promise<Organization> {
    const org = this.repo.create({ ...input, status: 'ACTIVE' });
    return this.repo.save(org);
  }

  async findById(id: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { id } });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.repo.countBy({ slug });
    return count > 0;
  }

  async countBySlugPrefix(prefix: string): Promise<number> {
    return this.repo.countBy({ slug: Like(`${prefix}%`) });
  }
}
