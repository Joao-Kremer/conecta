import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CryptoModule } from '../../infrastructure/crypto/crypto.module';

import { IStudentRepository } from './application/ports/student.repository.port';
import { AnonymizeStudentUseCase } from './application/use-cases/anonymize-student.use-case';
import { CreateStudentUseCase } from './application/use-cases/create-student.use-case';
import { DeleteStudentUseCase } from './application/use-cases/delete-student.use-case';
import { FindStudentUseCase } from './application/use-cases/find-student.use-case';
import { ListStudentsUseCase } from './application/use-cases/list-students.use-case';
import { UpdateStudentUseCase } from './application/use-cases/update-student.use-case';
import { Student } from './domain/entities/student.entity';
import { StudentTypeormRepository } from './infrastructure/repositories/student.typeorm.repository';
import { StudentsController } from './presentation/students.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Student]), CryptoModule],
  controllers: [StudentsController],
  providers: [
    CreateStudentUseCase,
    FindStudentUseCase,
    ListStudentsUseCase,
    UpdateStudentUseCase,
    DeleteStudentUseCase,
    AnonymizeStudentUseCase,
    { provide: IStudentRepository, useClass: StudentTypeormRepository },
  ],
})
export class StudentsModule {}
