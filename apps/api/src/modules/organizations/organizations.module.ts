import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IOrganizationRepository } from './application/ports/organization.repository.port';
import { FindOrganizationUseCase } from './application/use-cases/find-organization.use-case';
import { UpdateOrganizationUseCase } from './application/use-cases/update-organization.use-case';
import { Organization } from './domain/entities/organization.entity';
import { OrganizationTypeormRepository } from './infrastructure/repositories/organization.typeorm.repository';
import { OrganizationsController } from './presentation/organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  controllers: [OrganizationsController],
  providers: [
    FindOrganizationUseCase,
    UpdateOrganizationUseCase,
    { provide: IOrganizationRepository, useClass: OrganizationTypeormRepository },
  ],
})
export class OrganizationsModule {}
