import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type ClassEntity } from '../../domain/entities/class.entity';
import { IClassRepository } from '../ports/class.repository.port';

export interface FindClassInput {
  classId: string;
  organizationId: string;
}

@Injectable()
export class FindClassUseCase {
  constructor(private readonly classRepo: IClassRepository) {}

  async execute(input: FindClassInput): Promise<ClassEntity> {
    const cls = await this.classRepo.findById(input.classId, input.organizationId);

    if (!cls) {
      throw new NotFoundException('CLASS_NOT_FOUND', 'Class not found');
    }

    return cls;
  }
}
