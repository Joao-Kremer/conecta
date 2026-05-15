import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ISchoolRepository } from './application/ports/school.repository.port';
import { CreateSchoolUseCase } from './application/use-cases/create-school.use-case';
import { DeleteSchoolUseCase } from './application/use-cases/delete-school.use-case';
import { FindSchoolUseCase } from './application/use-cases/find-school.use-case';
import { ListSchoolsUseCase } from './application/use-cases/list-schools.use-case';
import { UpdateSchoolUseCase } from './application/use-cases/update-school.use-case';
import { School } from './domain/entities/school.entity';
import { SchoolTypeormRepository } from './infrastructure/repositories/school.typeorm.repository';
import { SchoolsController } from './presentation/schools.controller';

@Module({
  imports: [TypeOrmModule.forFeature([School])],
  controllers: [SchoolsController],
  providers: [
    CreateSchoolUseCase,
    FindSchoolUseCase,
    ListSchoolsUseCase,
    UpdateSchoolUseCase,
    DeleteSchoolUseCase,
    { provide: ISchoolRepository, useClass: SchoolTypeormRepository },
  ],
})
export class SchoolsModule {}
