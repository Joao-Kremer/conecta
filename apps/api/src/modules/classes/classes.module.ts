import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IClassRepository } from './application/ports/class.repository.port';
import { ICoachClassRepository } from './application/ports/coach-class.repository.port';
import { AssignCoachUseCase } from './application/use-cases/assign-coach.use-case';
import { CreateClassUseCase } from './application/use-cases/create-class.use-case';
import { DeleteClassUseCase } from './application/use-cases/delete-class.use-case';
import { FindClassUseCase } from './application/use-cases/find-class.use-case';
import { ListClassesUseCase } from './application/use-cases/list-classes.use-case';
import { RemoveCoachUseCase } from './application/use-cases/remove-coach.use-case';
import { UpdateClassUseCase } from './application/use-cases/update-class.use-case';
import { ClassEntity } from './domain/entities/class.entity';
import { CoachClass } from './domain/entities/coach-class.entity';
import { ClassTypeormRepository } from './infrastructure/repositories/class.typeorm.repository';
import { CoachClassTypeormRepository } from './infrastructure/repositories/coach-class.typeorm.repository';
import { ClassesController } from './presentation/classes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassEntity, CoachClass])],
  controllers: [ClassesController],
  providers: [
    CreateClassUseCase,
    FindClassUseCase,
    ListClassesUseCase,
    UpdateClassUseCase,
    DeleteClassUseCase,
    AssignCoachUseCase,
    RemoveCoachUseCase,
    { provide: IClassRepository, useClass: ClassTypeormRepository },
    { provide: ICoachClassRepository, useClass: CoachClassTypeormRepository },
  ],
})
export class ClassesModule {}
