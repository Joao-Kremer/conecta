import { Injectable } from '@nestjs/common';

import { type ClassEntity } from '../../domain/entities/class.entity';
import { IClassRepository } from '../ports/class.repository.port';

export interface ListClassesInput {
  organizationId: string;
  schoolId?: string;
  schoolModalityId?: string;
}

@Injectable()
export class ListClassesUseCase {
  constructor(private readonly classRepo: IClassRepository) {}

  async execute(input: ListClassesInput): Promise<ClassEntity[]> {
    return this.classRepo.findAll(input.organizationId, {
      schoolId: input.schoolId,
      schoolModalityId: input.schoolModalityId,
    });
  }
}
