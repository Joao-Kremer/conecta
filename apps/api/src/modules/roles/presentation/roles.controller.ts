import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { Post } from '@nestjs/common';

import { type IRequestContext } from '../../../shared/context/request.context';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { AssignRoleUseCase } from '../application/use-cases/assign-role.use-case';
import { ListRolesUseCase } from '../application/use-cases/list-roles.use-case';
import { RevokeRoleUseCase } from '../application/use-cases/revoke-role.use-case';

import { type AssignRoleDto, assignRoleSchema } from './dtos/assign-role.dto';

@Controller({ version: '1' })
export class RolesController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly revokeRoleUseCase: RevokeRoleUseCase,
  ) {}

  @Get('roles')
  @RequirePermissions('role:read')
  async listRoles() {
    return this.listRolesUseCase.execute();
  }

  @Post('users/:userId/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('role:assign')
  async assignRole(
    @CurrentUser() ctx: IRequestContext,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(assignRoleSchema)) body: AssignRoleDto,
  ) {
    return this.assignRoleUseCase.execute({
      targetUserId: userId,
      roleKey: body.roleKey,
      assignedBy: ctx.userId!,
      organizationId: ctx.organizationId!,
    });
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('role:assign')
  async revokeRole(
    @CurrentUser() ctx: IRequestContext,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    await this.revokeRoleUseCase.execute({
      targetUserId: userId,
      roleId,
      organizationId: ctx.organizationId!,
    });
  }
}
