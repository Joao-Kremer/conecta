import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  type CreateModalityData,
  IModalityRepository,
  type UpdateModalityData,
} from '../../application/ports/modality.repository.port';
import { Modality } from '../../domain/entities/modality.entity';

@Injectable()
export class ModalityTypeormRepository implements IModalityRepository {
  constructor(
    @InjectRepository(Modality) private readonly repo: Repository<Modality>,
  ) {}

  async findById(id: string, organizationId: string): Promise<Modality | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findAll(organizationId: string): Promise<Modality[]> {
    return this.repo.find({ where: { organizationId } });
  }

  async findByName(organizationId: string, name: string): Promise<Modality | null> {
    return this.repo.findOne({ where: { organizationId, name } });
  }

  async create(data: CreateModalityData): Promise<Modality> {
    const modality = this.repo.create(data);
    return this.repo.save(modality);
  }

  async update(id: string, organizationId: string, data: UpdateModalityData): Promise<Modality> {
    const modality = await this.repo.findOneOrFail({ where: { id, organizationId } });
    return this.repo.save(Object.assign(modality, data));
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repo.softDelete({ id, organizationId });
  }
}
