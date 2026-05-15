import { ConfigService } from '@nestjs/config';

import { SearchHashService } from './search-hash.service';

function makeService(): SearchHashService {
  const config = { get: () => 'a-test-secret-that-is-at-least-32-chars-long' } as unknown as ConfigService<Record<string, unknown>, true>;
  return new SearchHashService(config);
}

describe('SearchHashService', () => {
  it('produces same hash for same input', () => {
    const svc = makeService();
    expect(svc.hash('joao')).toBe(svc.hash('joao'));
  });

  it('produces different hashes for different inputs', () => {
    const svc = makeService();
    expect(svc.hash('joao')).not.toBe(svc.hash('maria'));
  });

  it('normalizes text: strips accents and lowercases', () => {
    const svc = makeService();
    expect(svc.normalizeText('João')).toBe('joao');
    expect(svc.normalizeText('  HÉLIO  ')).toBe('helio');
  });
});
