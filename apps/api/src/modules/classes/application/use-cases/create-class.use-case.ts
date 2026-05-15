import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { UnprocessableException } from '../../../../shared/exceptions/domain.exception';
import { type ClassEntity } from '../../domain/entities/class.entity';
import { IClassRepository, type ScheduleSlot } from '../ports/class.repository.port';

export interface CreateClassInput {
  organizationId: string;
  schoolId: string;
  schoolModalityId: string;
  name: string;
  ageGroup?: string | null;
  schedule: ScheduleSlot[];
  location?: string | null;
  capacity?: number | null;
  monthlyFeeCents?: number | null;
}

function validateSchedule(slots: ScheduleSlot[]): void {
  for (const slot of slots) {
    if (slot.weekday < 0 || slot.weekday > 6) {
      throw new UnprocessableException('INVALID_SCHEDULE', 'weekday must be 0-6');
    }
    const timeRe = /^\d{2}:\d{2}$/;
    if (!timeRe.test(slot.start) || !timeRe.test(slot.end)) {
      throw new UnprocessableException('INVALID_SCHEDULE', 'Time must be HH:MM');
    }
    if (slot.start >= slot.end) {
      throw new UnprocessableException('INVALID_SCHEDULE', 'start must be before end');
    }
  }
}

@Injectable()
export class CreateClassUseCase {
  constructor(private readonly classRepo: IClassRepository) {}

  async execute(input: CreateClassInput): Promise<ClassEntity> {
    validateSchedule(input.schedule);

    const id = uuidv7();

    return this.classRepo.create({
      id,
      organizationId: input.organizationId,
      schoolId: input.schoolId,
      schoolModalityId: input.schoolModalityId,
      name: input.name,
      ageGroup: input.ageGroup,
      schedule: input.schedule,
      location: input.location,
      capacity: input.capacity,
      monthlyFeeCents: input.monthlyFeeCents,
    });
  }
}
