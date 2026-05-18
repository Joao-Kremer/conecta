import { MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { ConfigModule } from './infrastructure/config/config.module';
import { CryptoModule } from './infrastructure/crypto/crypto.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './infrastructure/health/health.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { ModalitiesModule } from './modules/modalities/modalities.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RolesModule } from './modules/roles/roles.module';
import { SchoolModalitiesModule } from './modules/school-modalities/school-modalities.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { StudentGuardiansModule } from './modules/student-guardians/student-guardians.module';
import { StudentsModule } from './modules/students/students.module';
import { UsersModule } from './modules/users/users.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { AuthGuard } from './shared/guards/auth.guard';
import { CsrfGuard } from './shared/guards/csrf.guard';
import { OwnershipGuard } from './shared/guards/ownership.guard';
import { PermissionsGuard } from './shared/guards/permissions.guard';
import { AuditInterceptor } from './shared/interceptors/audit.interceptor';
import { IdempotencyInterceptor } from './shared/interceptors/idempotency.interceptor';
import { SchoolScopeInterceptor } from './shared/interceptors/school-scope.interceptor';
import { RequestIdMiddleware } from './shared/middlewares/request-id.middleware';
import { OwnershipResolverRegistry } from './shared/ownership/ownership-resolver.registry';
import { ClassOwnershipResolver } from './shared/ownership/resolvers/class.ownership-resolver';
import { GuardianOwnershipResolver } from './shared/ownership/resolvers/guardian.ownership-resolver';
import { SchoolOwnershipResolver } from './shared/ownership/resolvers/school.ownership-resolver';
import { StudentOwnershipResolver } from './shared/ownership/resolvers/student.ownership-resolver';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    HealthModule,
    CryptoModule,
    RedisModule,
    AuthModule,
    OrganizationsModule,
    SchoolsModule,
    ModalitiesModule,
    SchoolModalitiesModule,
    ClassesModule,
    UsersModule,
    RolesModule,
    GuardiansModule,
    StudentsModule,
    StudentGuardiansModule,
    ConsentsModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  providers: [
    OwnershipResolverRegistry,
    SchoolOwnershipResolver,
    ClassOwnershipResolver,
    StudentOwnershipResolver,
    GuardianOwnershipResolver,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: OwnershipGuard },
    { provide: APP_INTERCEPTOR, useClass: SchoolScopeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(
    private readonly registry: OwnershipResolverRegistry,
    private readonly schoolResolver: SchoolOwnershipResolver,
    private readonly classResolver: ClassOwnershipResolver,
    private readonly studentResolver: StudentOwnershipResolver,
    private readonly guardianResolver: GuardianOwnershipResolver,
  ) {}

  onModuleInit(): void {
    this.registry.register('school', this.schoolResolver);
    this.registry.register('class', this.classResolver);
    this.registry.register('student', this.studentResolver);
    this.registry.register('guardian', this.guardianResolver);
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
