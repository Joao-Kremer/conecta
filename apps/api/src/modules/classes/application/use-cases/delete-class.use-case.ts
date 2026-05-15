import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IClassRepository } from '../ports/class.repository.port';

export interface DeleteClassInput {
  classId: string;
  organizationId: string;
}

@Injectable()
export class DeleteClassUseCase {
  constructor(private readonly classRepo: IClassRepository) {}

  async execute(input: DeleteClassInput): Promise<void> {
    const existing = await this.classRepo.findById(input.classId, input.organizationId);

    if (!existing) {
      throw new NotFoundException('CLASS_NOT_FOUND', 'Class not found');
    }

    await this.classRepo.softDelete(input.classId, input.organizationId);
  }
}
