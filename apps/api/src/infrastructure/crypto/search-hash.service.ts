import { createHmac } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type Env } from '../config/env.schema';

@Injectable()
export class SearchHashService {
  private readonly key: string;

  constructor(config: ConfigService<Env, true>) {
    this.key = config.get('SEARCH_HASH_SECRET', { infer: true });
  }

  hash(value: string): string {
    return createHmac('sha256', this.key).update(value).digest('hex').slice(0, 32);
  }

  normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }
}
