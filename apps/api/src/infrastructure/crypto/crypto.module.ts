import { Module, OnModuleInit } from '@nestjs/common';

import { EncryptionService } from './encryption.service';
import { configureEncryptionTransformer } from './encryption.transformer';
import { PasswordService } from './password.service';
import { SearchHashService } from './search-hash.service';

@Module({
  providers: [EncryptionService, SearchHashService, PasswordService],
  exports: [EncryptionService, SearchHashService, PasswordService],
})
export class CryptoModule implements OnModuleInit {
  constructor(private readonly encryption: EncryptionService) {}

  onModuleInit(): void {
    configureEncryptionTransformer(this.encryption);
  }
}
