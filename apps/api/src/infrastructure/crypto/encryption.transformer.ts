import { type ValueTransformer } from 'typeorm';

import { type EncryptionService } from './encryption.service';

let _service: EncryptionService | undefined;

export function configureEncryptionTransformer(service: EncryptionService): void {
  _service = service;
}

export const encryptedTransformer: ValueTransformer = {
  to(value: string | null | undefined): string | null {
    if (value == null) return null;
    if (!_service) throw new Error('EncryptionService not configured');
    return _service.encrypt(value);
  },
  from(value: string | null | undefined): string | null {
    if (value == null) return null;
    if (!_service) throw new Error('EncryptionService not configured');
    return _service.decrypt(value);
  },
};
