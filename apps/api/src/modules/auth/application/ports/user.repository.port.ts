import { type User } from '../../../users/domain/entities/user.entity';

export interface CreateUserInput {
  id: string;
  organizationId: string;
  email: string;
  passwordHash: string;
  name: string;
  status: string;
  verificationTokenHash: string;
  verificationTokenExpiresAt: Date;
}

export abstract class IUserRepository {
  abstract findByEmail(organizationId: string, email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByVerificationToken(tokenHash: string): Promise<User | null>;
  abstract findByPasswordResetToken(tokenHash: string): Promise<User | null>;
  abstract create(input: CreateUserInput): Promise<User>;
  abstract save(user: User): Promise<User>;
  abstract countByEmail(email: string): Promise<number>;
}
