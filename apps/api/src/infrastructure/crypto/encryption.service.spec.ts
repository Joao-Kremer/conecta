import { ConfigService } from '@nestjs/config';

import { EncryptionService } from './encryption.service';

function makeService(key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='): EncryptionService {
  const config = { get: () => key } as unknown as ConfigService<Record<string, unknown>, true>;
  return new EncryptionService(config);
}

describe('EncryptionService', () => {
  it('round-trips plaintext', () => {
    const svc = makeService();
    const plain = 'Hello, World!';
    expect(svc.decrypt(svc.encrypt(plain))).toBe(plain);
  });

  it('produces different ciphertexts for same input (random IV)', () => {
    const svc = makeService();
    const a = svc.encrypt('test');
    const b = svc.encrypt('test');
    expect(a).not.toBe(b);
  });

  it('throws on tampered ciphertext', () => {
    const svc = makeService();
    const ct = svc.encrypt('secret');
    const tampered = ct.slice(0, -4) + 'XXXX';
    expect(() => svc.decrypt(tampered)).toThrow();
  });

  it('throws on invalid key length', () => {
    expect(() => makeService('tooshort')).toThrow('32 bytes');
  });
});
