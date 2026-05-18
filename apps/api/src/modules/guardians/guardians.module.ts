import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CryptoModule } from '../../infrastructure/crypto/crypto.module';

import { IGuardianRepository } from './application/ports/guardian.repository.port';
import { CreateGuardianUseCase } from './application/use-cases/create-guardian.use-case';
import { DeleteGuardianUseCase } from './application/use-cases/delete-guardian.use-case';
import { FindGuardianUseCase } from './application/use-cases/find-guardian.use-case';
import { ListGuardiansUseCase } from './application/use-cases/list-guardians.use-case';
import { UpdateGuardianUseCase } from './application/use-cases/update-guardian.use-case';
import { Guardian } from './domain/entities/guardian.entity';
import { GuardianTypeormRepository } from './infrastructure/repositories/guardian.typeorm.repository';
import { GuardiansController } from './presentation/guardians.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Guardian]), CryptoModule],
  controllers: [GuardiansController],
  providers: [
    CreateGuardianUseCase,
    FindGuardianUseCase,
    ListGuardiansUseCase,
    UpdateGuardianUseCase,
    DeleteGuardianUseCase,
    { provide: IGuardianRepository, useClass: GuardianTypeormRepository },
  ],
})
export class GuardiansModule {}
