import { Injectable } from '@nestjs/common';

import { SearchHashService } from '../../../../infrastructure/crypto/search-hash.service';
import { type Student } from '../../domain/entities/student.entity';
import { IStudentRepository } from '../ports/student.repository.port';

export interface ListStudentsInput {
  organizationId: string;
  search?: string;
  status?: string;
}

@Injectable()
export class ListStudentsUseCase {
  constructor(
    private readonly studentRepo: IStudentRepository,
    private readonly searchHash: SearchHashService,
  ) {}

  async execute(input: ListStudentsInput): Promise<Student[]> {
    const search = input.search
      ? this.searchHash.normalizeText(input.search)
      : undefined;

    return this.studentRepo.findAll(input.organizationId, {
      search,
      status: input.status,
    });
  }
}
