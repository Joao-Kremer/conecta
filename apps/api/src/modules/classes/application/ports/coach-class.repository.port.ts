import { type CoachClass } from '../../domain/entities/coach-class.entity';

export abstract class ICoachClassRepository {
  abstract assign(classId: string, userId: string, organizationId: string): Promise<CoachClass>;
  abstract remove(classId: string, userId: string, organizationId: string): Promise<void>;
  abstract findByClass(classId: string, organizationId: string): Promise<CoachClass[]>;
  abstract exists(classId: string, userId: string, organizationId: string): Promise<boolean>;
}
