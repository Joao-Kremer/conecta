import { type ClassEntity } from '../../domain/entities/class.entity';

export interface ScheduleSlot {
  weekday: number;
  start: string;
  end: string;
}

export interface CreateClassData {
  id: string;
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

export interface UpdateClassData {
  name?: string;
  ageGroup?: string | null;
  schedule?: ScheduleSlot[];
  location?: string | null;
  capacity?: number | null;
  monthlyFeeCents?: number | null;
  status?: string;
}

export abstract class IClassRepository {
  abstract findById(id: string, organizationId: string): Promise<ClassEntity | null>;
  abstract findAll(
    organizationId: string,
    filters?: { schoolId?: string; schoolModalityId?: string },
  ): Promise<ClassEntity[]>;
  abstract create(data: CreateClassData): Promise<ClassEntity>;
  abstract update(id: string, organizationId: string, data: UpdateClassData): Promise<ClassEntity>;
  abstract softDelete(id: string, organizationId: string): Promise<void>;
}
