import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ISchoolModalityRepository } from './application/ports/school-modality.repository.port';
import { CreateSchoolModalityUseCase } from './application/use-cases/create-school-modality.use-case';
import { DeleteSchoolModalityUseCase } from './application/use-cases/delete-school-modality.use-case';
import { FindSchoolModalityUseCase } from './application/use-cases/find-school-modality.use-case';
import { ListSchoolModalitiesUseCase } from './application/use-cases/list-school-modalities.use-case';
import { UpdateSchoolModalityUseCase } from './application/use-cases/update-school-modality.use-case';
import { SchoolModality } from './domain/entities/school-modality.entity';
import { SchoolModalityTypeormRepository } from './infrastructure/repositories/school-modality.typeorm.repository';
import { SchoolModalitiesController } from './presentation/school-modalities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolModality])],
  controllers: [SchoolModalitiesController],
  providers: [
    CreateSchoolModalityUseCase,
    FindSchoolModalityUseCase,
    ListSchoolModalitiesUseCase,
    UpdateSchoolModalityUseCase,
    DeleteSchoolModalityUseCase,
    { provide: ISchoolModalityRepository, useClass: SchoolModalityTypeormRepository },
  ],
})
export class SchoolModalitiesModule {}
