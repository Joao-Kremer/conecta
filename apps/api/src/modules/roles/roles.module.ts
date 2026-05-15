import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';


import { IRoleRepository, IUserRoleRepository } from './application/ports/role.repository.port';
import { AssignRoleUseCase } from './application/use-cases/assign-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { RevokeRoleUseCase } from './application/use-cases/revoke-role.use-case';
import { Permission } from './domain/entities/permission.entity';
import { Role } from './domain/entities/role.entity';
import { UserRole } from './domain/entities/user-role.entity';
import { RoleTypeormRepository } from './infrastructure/repositories/role.typeorm.repository';
import { UserRoleTypeormRepository } from './infrastructure/repositories/user-role.typeorm.repository';
import { RolesController } from './presentation/roles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, UserRole, Permission])],
  controllers: [RolesController],
  providers: [
    ListRolesUseCase,
    AssignRoleUseCase,
    RevokeRoleUseCase,
    { provide: IRoleRepository, useClass: RoleTypeormRepository },
    { provide: IUserRoleRepository, useClass: UserRoleTypeormRepository },
  ],
})
export class RolesModule {}
