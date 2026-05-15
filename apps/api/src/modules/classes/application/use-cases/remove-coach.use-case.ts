import { Injectable } from '@nestjs/common';

import { ICoachClassRepository } from '../ports/coach-class.repository.port';

export interface RemoveCoachInput {
  classId: string;
  userId: string;
  organizationId: string;
}

@Injectable()
export class RemoveCoachUseCase {
  constructor(private readonly coachClassRepo: ICoachClassRepository) {}

  async execute(input: RemoveCoachInput): Promise<void> {
    await this.coachClassRepo.remove(input.classId, input.userId, input.organizationId);
  }
}
