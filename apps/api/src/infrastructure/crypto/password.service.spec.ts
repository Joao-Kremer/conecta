import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it(
    'hashes and verifies a password',
    async () => {
      const hash = await svc.hash('my-secret-pass');
      expect(await svc.verify(hash, 'my-secret-pass')).toBe(true);
    },
    15000,
  );

  it(
    'rejects wrong password',
    async () => {
      const hash = await svc.hash('correct');
      expect(await svc.verify(hash, 'wrong')).toBe(false);
    },
    15000,
  );
});
