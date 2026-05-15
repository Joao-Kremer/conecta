import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';

import { type IRequestContext } from '../../../shared/context/request.context';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { FindOrganizationUseCase } from '../application/use-cases/find-organization.use-case';
import { UpdateOrganizationUseCase } from '../application/use-cases/update-organization.use-case';

import { type UpdateOrganizationDto, updateOrganizationSchema } from './dtos/update-organization.dto';

@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(
    private readonly findOrganizationUseCase: FindOrganizationUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
  ) {}

  @Get('me')
  @RequirePermissions('organization:read')
  async getMe(@CurrentUser() ctx: IRequestContext) {
    return this.findOrganizationUseCase.execute({ organizationId: ctx.organizationId! });
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('organization:update')
  async updateMe(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: UpdateOrganizationDto,
  ) {
    return this.updateOrganizationUseCase.execute({
      organizationId: ctx.organizationId!,
      ...body,
    });
  }
}
