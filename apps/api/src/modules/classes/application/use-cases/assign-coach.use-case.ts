import { Injectable } from '@nestjs/common';

import { ConflictException, NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { type CoachClass } from '../../domain/entities/coach-class.entity';
import { IClassRepository } from '../ports/class.repository.port';
import { ICoachClassRepository } from '../ports/coach-class.repository.port';

export interface AssignCoachInput {
  classId: string;
  userId: string;
  organizationId: string;
}

@Injectable()
export class AssignCoachUseCase {
  constructor(
    private readonly classRepo: IClassRepository,
    private readonly coachClassRepo: ICoachClassRepository,
  ) {}

  async execute(input: AssignCoachInput): Promise<CoachClass> {
    const cls = await this.classRepo.findById(input.classId, input.organizationId);

    if (!cls) {
      throw new NotFoundException('CLASS_NOT_FOUND', 'Class not found');
    }

    const alreadyAssigned = await this.coachClassRepo.exists(
      input.classId,
      input.userId,
      input.organizationId,
    );

    if (alreadyAssigned) {
      throw new ConflictException('COACH_ALREADY_ASSIGNED', 'Coach is already assigned to this class');
    }

    return this.coachClassRepo.assign(input.classId, input.userId, input.organizationId);
  }
}
