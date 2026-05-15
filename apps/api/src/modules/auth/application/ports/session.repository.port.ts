import { type Session } from '../../domain/entities/session.entity';

export interface CreateSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
  family: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
}

export abstract class ISessionRepository {
  abstract create(input: CreateSessionInput): Promise<Session>;
  abstract findById(id: string): Promise<Session | null>;
  abstract findActiveByFamily(family: string): Promise<Session[]>;
  abstract revoke(id: string): Promise<void>;
  abstract revokeFamily(family: string): Promise<void>;
  abstract revokeAllForUser(userId: string): Promise<void>;
  abstract markReplaced(oldId: string, newId: string): Promise<void>;
}
