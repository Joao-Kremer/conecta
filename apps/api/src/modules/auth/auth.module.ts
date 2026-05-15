import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CryptoModule } from '../../infrastructure/crypto/crypto.module';
import { Organization } from '../organizations/domain/entities/organization.entity';
import { Permission } from '../roles/domain/entities/permission.entity';
import { Role } from '../roles/domain/entities/role.entity';
import { UserRole } from '../roles/domain/entities/user-role.entity';
import { StaffSchool } from '../schools/domain/entities/staff-school.entity';
import { User } from '../users/domain/entities/user.entity';

import { IEmailSender } from './application/ports/email-sender.port';
import { IInviteRepository } from './application/ports/invite.repository.port';
import { IOrganizationRepository } from './application/ports/organization.repository.port';
import { ISessionRepository } from './application/ports/session.repository.port';
import { IUserRoleRepository } from './application/ports/user-role.repository.port';
import { IUserRepository } from './application/ports/user.repository.port';
import { AcceptInviteUseCase } from './application/use-cases/accept-invite.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutAllUseCase } from './application/use-cases/logout-all.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { MeUseCase } from './application/use-cases/me.use-case';
import { RefreshUseCase } from './application/use-cases/refresh.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { SignupOrganizationUseCase } from './application/use-cases/signup-organization.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { Invite } from './domain/entities/invite.entity';
import { Session } from './domain/entities/session.entity';
import { NoopEmailSender } from './infrastructure/email/noop-email-sender';
import { PermissionCacheService } from './infrastructure/permission-cache.service';
import { AuthInviteTypeormRepository } from './infrastructure/repositories/auth-invite.typeorm.repository';
import { AuthOrganizationTypeormRepository } from './infrastructure/repositories/auth-organization.typeorm.repository';
import { AuthSessionTypeormRepository } from './infrastructure/repositories/auth-session.typeorm.repository';
import { AuthUserRoleTypeormRepository } from './infrastructure/repositories/auth-user-role.typeorm.repository';
import { AuthUserTypeormRepository } from './infrastructure/repositories/auth-user.typeorm.repository';
import { TokenService } from './infrastructure/token/token.service';
import { AuthController } from './presentation/auth.controller';

const USE_CASES = [
  SignupOrganizationUseCase,
  VerifyEmailUseCase,
  LoginUseCase,
  RefreshUseCase,
  LogoutUseCase,
  LogoutAllUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  AcceptInviteUseCase,
  MeUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      Session,
      Invite,
      Role,
      Permission,
      UserRole,
      StaffSchool,
    ]),
    JwtModule.register({}),
    CryptoModule,
  ],
  controllers: [AuthController],
  providers: [
    TokenService,
    PermissionCacheService,
    ...USE_CASES,
    { provide: IUserRepository, useClass: AuthUserTypeormRepository },
    { provide: IOrganizationRepository, useClass: AuthOrganizationTypeormRepository },
    { provide: ISessionRepository, useClass: AuthSessionTypeormRepository },
    { provide: IInviteRepository, useClass: AuthInviteTypeormRepository },
    { provide: IUserRoleRepository, useClass: AuthUserRoleTypeormRepository },
    { provide: IEmailSender, useClass: NoopEmailSender },
  ],
  exports: [TokenService, PermissionCacheService],
})
export class AuthModule {}
