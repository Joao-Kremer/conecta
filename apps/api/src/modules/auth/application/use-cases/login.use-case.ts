import { Injectable, UnauthorizedException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { PasswordService } from '../../../../infrastructure/crypto/password.service';
import { TokenService } from '../../infrastructure/token/token.service';
import { ISessionRepository } from '../ports/session.repository.port';
import { IUserRoleRepository } from '../ports/user-role.repository.port';
import { IUserRepository } from '../ports/user.repository.port';

export interface LoginInput {
  organizationId: string;
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshCookieValue: string;
  sessionId: string;
  userId: string;
  roles: string[];
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly userRoleRepo: IUserRoleRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepo.findByEmail(input.organizationId, input.email.toLowerCase().trim());

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account not active — please verify your email');
    }

    const passwordValid = await this.passwordService.verify(user.passwordHash, input.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (this.passwordService.needsRehash(user.passwordHash)) {
      user.passwordHash = await this.passwordService.hash(input.password);
      await this.userRepo.save(user);
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const roles = await this.userRoleRepo.getUserRoleKeys(user.id);
    const sessionId = uuidv7();
    const { hash, cookieValue } = await this.tokenService.generateRefreshToken(sessionId);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hash,
      family: uuidv7(),
      userAgent: input.userAgent,
      ip: input.ip,
      expiresAt,
    });

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      org: user.organizationId,
      roles,
    });

    return { accessToken, refreshCookieValue: cookieValue, sessionId, userId: user.id, roles };
  }
}
