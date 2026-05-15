import { type User } from '../../domain/entities/user.entity';

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string | null;
}

export abstract class IUserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findAllByOrganization(organizationId: string): Promise<User[]>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
}
