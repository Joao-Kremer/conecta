import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Invite } from '../auth/domain/entities/invite.entity';


import { IInviteRepository } from './application/ports/invite.repository.port';
import { IUserRepository } from './application/ports/user.repository.port';
import { CreateInviteUseCase } from './application/use-cases/create-invite.use-case';
import { FindUserUseCase } from './application/use-cases/find-user.use-case';
import { ListInvitesUseCase } from './application/use-cases/list-invites.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { RevokeInviteUseCase } from './application/use-cases/revoke-invite.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { User } from './domain/entities/user.entity';
import { InviteTypeormRepository } from './infrastructure/repositories/invite.typeorm.repository';
import { UserTypeormRepository } from './infrastructure/repositories/user.typeorm.repository';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Invite])],
  controllers: [UsersController],
  providers: [
    FindUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    CreateInviteUseCase,
    RevokeInviteUseCase,
    ListInvitesUseCase,
    { provide: IUserRepository, useClass: UserTypeormRepository },
    { provide: IInviteRepository, useClass: InviteTypeormRepository },
  ],
})
export class UsersModule {}
