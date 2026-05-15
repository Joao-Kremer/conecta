import { Injectable } from '@nestjs/common';

import { ISessionRepository } from '../ports/session.repository.port';

export interface LogoutInput {
  sessionId: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  async execute(input: LogoutInput): Promise<void> {
    await this.sessionRepo.revoke(input.sessionId);
  }
}
