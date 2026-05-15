import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IModalityRepository } from './application/ports/modality.repository.port';
import { CreateModalityUseCase } from './application/use-cases/create-modality.use-case';
import { DeleteModalityUseCase } from './application/use-cases/delete-modality.use-case';
import { FindModalityUseCase } from './application/use-cases/find-modality.use-case';
import { ListModalitiesUseCase } from './application/use-cases/list-modalities.use-case';
import { UpdateModalityUseCase } from './application/use-cases/update-modality.use-case';
import { Modality } from './domain/entities/modality.entity';
import { ModalityTypeormRepository } from './infrastructure/repositories/modality.typeorm.repository';
import { ModalitiesController } from './presentation/modalities.controller';

const USE_CASES = [
  CreateModalityUseCase,
  FindModalityUseCase,
  ListModalitiesUseCase,
  UpdateModalityUseCase,
  DeleteModalityUseCase,
];

@Module({
  imports: [TypeOrmModule.forFeature([Modality])],
  controllers: [ModalitiesController],
  providers: [
    ...USE_CASES,
    { provide: IModalityRepository, useClass: ModalityTypeormRepository },
  ],
})
export class ModalitiesModule {}
