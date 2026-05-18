import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IConsentRepository } from './application/ports/consent.repository.port';
import { HasActiveConsentUseCase } from './application/use-cases/has-active-consent.use-case';
import { ListConsentsUseCase } from './application/use-cases/list-consents.use-case';
import { RecordConsentUseCase } from './application/use-cases/record-consent.use-case';
import { RevokeConsentUseCase } from './application/use-cases/revoke-consent.use-case';
import { Consent } from './domain/entities/consent.entity';
import { ConsentTypeormRepository } from './infrastructure/repositories/consent.typeorm.repository';
import { ConsentsController } from './presentation/consents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Consent])],
  controllers: [ConsentsController],
  providers: [
    RecordConsentUseCase,
    RevokeConsentUseCase,
    ListConsentsUseCase,
    HasActiveConsentUseCase,
    { provide: IConsentRepository, useClass: ConsentTypeormRepository },
  ],
  exports: [HasActiveConsentUseCase, RecordConsentUseCase],
})
export class ConsentsModule {}
