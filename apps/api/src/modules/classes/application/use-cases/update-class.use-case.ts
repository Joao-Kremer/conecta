import { Injectable } from '@nestjs/common';

import { NotFoundException, UnprocessableException } from '../../../../shared/exceptions/domain.exception';
import { type ClassEntity } from '../../domain/entities/class.entity';
import { IClassRepository, type ScheduleSlot } from '../ports/class.repository.port';

export interface UpdateClassInput {
  classId: string;
  organizationId: string;
  name?: string;
  ageGroup?: string | null;
  schedule?: ScheduleSlot[];
  location?: string | null;
  capacity?: number | null;
  monthlyFeeCents?: number | null;
  status?: string;
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
export class UpdateClassUseCase {
  constructor(private readonly classRepo: IClassRepository) {}

  async execute(input: UpdateClassInput): Promise<ClassEntity> {
    const existing = await this.classRepo.findById(input.classId, input.organizationId);

    if (!existing) {
      throw new NotFoundException('CLASS_NOT_FOUND', 'Class not found');
    }

    if (input.schedule !== undefined) {
      validateSchedule(input.schedule);
    }

    return this.classRepo.update(input.classId, input.organizationId, {
      name: input.name,
      ageGroup: input.ageGroup,
      schedule: input.schedule,
      location: input.location,
      capacity: input.capacity,
      monthlyFeeCents: input.monthlyFeeCents,
      status: input.status,
    });
  }
}
