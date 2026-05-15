import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { uuidv7 } from 'uuidv7';

import { TokenService } from '../../infrastructure/token/token.service';
import { ISessionRepository } from '../ports/session.repository.port';
import { IUserRoleRepository } from '../ports/user-role.repository.port';
import { IUserRepository } from '../ports/user.repository.port';

export interface RefreshInput {
  refreshCookieValue: string;
  userAgent?: string;
  ip?: string;
}

export interface RefreshOutput {
  accessToken: string;
  refreshCookieValue: string;
  sessionId: string;
}

@Injectable()
export class RefreshUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly userRepo: IUserRepository,
    private readonly userRoleRepo: IUserRoleRepository,
    private readonly tokenService: TokenService,
    @InjectPinoLogger(RefreshUseCase.name) private readonly logger: PinoLogger,
  ) {}

  async execute(input: RefreshInput): Promise<RefreshOutput> {
    const parsed = this.tokenService.parseRefreshCookie(input.refreshCookieValue);
    if (!parsed) throw new UnauthorizedException();

    const { sessionId, raw } = parsed;
    const session = await this.sessionRepo.findById(sessionId);

    if (!session || session.revokedAt) {
      throw new UnauthorizedException();
    }

    if (session.replacedById) {
      this.logger.warn({ family: session.family }, 'Refresh token reuse detected — revoking family');
      await this.sessionRepo.revokeFamily(session.family);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const tokenValid = await this.tokenService.verifyRefreshToken(raw, session.refreshTokenHash);
    if (!tokenValid) {
      throw new UnauthorizedException();
    }

    const user = await this.userRepo.findById(session.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    const roles = await this.userRoleRepo.getUserRoleKeys(user.id);
    const newSessionId = uuidv7();
    const { hash, cookieValue } = await this.tokenService.generateRefreshToken(newSessionId);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.sessionRepo.create({
      id: newSessionId,
      userId: user.id,
      refreshTokenHash: hash,
      family: session.family,
      userAgent: input.userAgent,
      ip: input.ip,
      expiresAt,
    });

    await this.sessionRepo.markReplaced(session.id, newSessionId);

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      org: user.organizationId,
      roles,
    });

    return { accessToken, refreshCookieValue: cookieValue, sessionId: newSessionId };
  }
}
