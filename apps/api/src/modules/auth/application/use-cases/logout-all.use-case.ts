import { Injectable } from '@nestjs/common';

import { ISessionRepository } from '../ports/session.repository.port';

export interface LogoutAllInput {
  userId: string;
}

@Injectable()
export class LogoutAllUseCase {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  async execute(input: LogoutAllInput): Promise<void> {
    await this.sessionRepo.revokeAllForUser(input.userId);
  }
}
