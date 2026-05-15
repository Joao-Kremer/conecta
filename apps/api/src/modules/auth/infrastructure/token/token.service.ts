import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { uuidv7 } from 'uuidv7';

import { type Env } from '../../../../infrastructure/config/env.schema';

export interface AccessTokenPayload {
  sub: string;
  org: string;
  roles: string[];
  jti: string;
}

export interface RefreshTokenBundle {
  raw: string;
  hash: string;
  cookieValue: string;
}

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.accessTtl = config.get('JWT_ACCESS_TOKEN_TTL', { infer: true });
  }

  signAccessToken(payload: Omit<AccessTokenPayload, 'jti'>): string {
    return this.jwt.sign(
      { ...payload, jti: uuidv7() },
      { secret: this.accessSecret, expiresIn: this.accessTtl },
    );
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token, { secret: this.accessSecret });
  }

  async generateRefreshToken(sessionId: string): Promise<RefreshTokenBundle> {
    const raw = randomBytes(32).toString('base64url');
    const hash = await argon2.hash(raw, ARGON2_OPTIONS);
    return { raw, hash, cookieValue: `${sessionId}:${raw}` };
  }

  async verifyRefreshToken(raw: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, raw);
  }

  parseRefreshCookie(cookieValue: string): { sessionId: string; raw: string } | null {
    const idx = cookieValue.indexOf(':');
    if (idx === -1) return null;
    return { sessionId: cookieValue.slice(0, idx), raw: cookieValue.slice(idx + 1) };
  }
}
