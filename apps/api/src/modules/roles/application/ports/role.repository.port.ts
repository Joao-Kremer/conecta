import { type Role } from '../../domain/entities/role.entity';
import { type UserRole } from '../../domain/entities/user-role.entity';

export abstract class IRoleRepository {
  abstract findAll(): Promise<Role[]>;
  abstract findByKey(key: string): Promise<Role | null>;
  abstract findById(id: string): Promise<Role | null>;
}

export abstract class IUserRoleRepository {
  abstract assign(userId: string, roleId: string, assignedBy: string): Promise<UserRole>;
  abstract revoke(userId: string, roleId: string): Promise<void>;
  abstract findByUser(userId: string): Promise<UserRole[]>;
  abstract exists(userId: string, roleId: string): Promise<boolean>;
}
