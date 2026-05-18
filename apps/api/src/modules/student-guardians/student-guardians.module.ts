import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IStudentGuardianRepository } from './application/ports/student-guardian.repository.port';
import { LinkGuardianToStudentUseCase } from './application/use-cases/link-guardian-to-student.use-case';
import { ListGuardiansForStudentUseCase } from './application/use-cases/list-guardians-for-student.use-case';
import { ListStudentsForGuardianUseCase } from './application/use-cases/list-students-for-guardian.use-case';
import { UnlinkGuardianFromStudentUseCase } from './application/use-cases/unlink-guardian-from-student.use-case';
import { UpdateStudentGuardianUseCase } from './application/use-cases/update-student-guardian.use-case';
import { StudentGuardian } from './domain/entities/student-guardian.entity';
import { StudentGuardianTypeormRepository } from './infrastructure/repositories/student-guardian.typeorm.repository';
import { StudentGuardiansController } from './presentation/student-guardians.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudentGuardian])],
  controllers: [StudentGuardiansController],
  providers: [
    LinkGuardianToStudentUseCase,
    ListGuardiansForStudentUseCase,
    ListStudentsForGuardianUseCase,
    UpdateStudentGuardianUseCase,
    UnlinkGuardianFromStudentUseCase,
    { provide: IStudentGuardianRepository, useClass: StudentGuardianTypeormRepository },
  ],
})
export class StudentGuardiansModule {}
