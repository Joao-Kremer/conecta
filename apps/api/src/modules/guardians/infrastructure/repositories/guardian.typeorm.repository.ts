import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  IGuardianRepository,
  type CreateGuardianData,
  type UpdateGuardianData,
} from '../../application/ports/guardian.repository.port';
import { Guardian } from '../../domain/entities/guardian.entity';

@Injectable()
export class GuardianTypeormRepository implements IGuardianRepository {
  constructor(
    @InjectRepository(Guardian) private readonly repo: Repository<Guardian>,
  ) {}

  async findById(id: string, organizationId: string): Promise<Guardian | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findAll(organizationId: string): Promise<Guardian[]> {
    return this.repo.find({ where: { organizationId } });
  }

  async findByIds(ids: string[], organizationId: string): Promise<Guardian[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repo.find({ where: { organizationId, id: In(ids) } });
  }

  async findByEmail(email: string, organizationId: string): Promise<Guardian | null> {
    return this.repo.findOne({ where: { email, organizationId } });
  }

  async create(data: CreateGuardianData): Promise<Guardian> {
    const guardian = this.repo.create({
      id: data.id,
      organizationId: data.organizationId,
      fullName: data.fullName,
      fullNameSearch: data.fullNameSearch,
      document: data.document ?? null,
      documentSearch: data.documentSearch ?? null,
      phone: data.phone,
      phoneSearch: data.phoneSearch,
      email: data.email,
      address: data.address ?? null,
      userId: data.userId ?? null,
    });
    return this.repo.save(guardian);
  }

  async update(id: string, organizationId: string, data: UpdateGuardianData): Promise<Guardian> {
    const guardian = await this.repo.findOneOrFail({ where: { id, organizationId } });
    return this.repo.save(Object.assign(guardian, data));
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repo.softDelete({ id, organizationId });
  }
}
