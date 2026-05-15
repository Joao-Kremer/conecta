import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { type IRequestContext } from '../../../shared/context/request.context';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateInviteUseCase } from '../application/use-cases/create-invite.use-case';
import { FindUserUseCase } from '../application/use-cases/find-user.use-case';
import { ListInvitesUseCase } from '../application/use-cases/list-invites.use-case';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case';
import { RevokeInviteUseCase } from '../application/use-cases/revoke-invite.use-case';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case';

import { type CreateInviteDto, createInviteSchema } from './dtos/create-invite.dto';
import { type UpdateUserDto, updateUserSchema } from './dtos/update-user.dto';

@Controller({ version: '1' })
export class UsersController {
  constructor(
    private readonly findUserUseCase: FindUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly createInviteUseCase: CreateInviteUseCase,
    private readonly revokeInviteUseCase: RevokeInviteUseCase,
    private readonly listInvitesUseCase: ListInvitesUseCase,
  ) {}

  @Get('users')
  @RequirePermissions('user:read')
  async listUsers(@CurrentUser() ctx: IRequestContext) {
    return this.listUsersUseCase.execute({ organizationId: ctx.organizationId! });
  }

  @Get('users/me')
  async getMe(@CurrentUser() ctx: IRequestContext) {
    return this.findUserUseCase.execute({ userId: ctx.userId! });
  }

  @Patch('users/me')
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto,
  ) {
    return this.updateUserUseCase.execute({ userId: ctx.userId!, ...body });
  }

  @Post('invites')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user:invite')
  async createInvite(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(createInviteSchema)) body: CreateInviteDto,
  ) {
    return this.createInviteUseCase.execute({
      organizationId: ctx.organizationId!,
      invitedBy: ctx.userId!,
      ...body,
    });
  }

  @Get('invites')
  @RequirePermissions('user:read')
  async listInvites(@CurrentUser() ctx: IRequestContext) {
    return this.listInvitesUseCase.execute({ organizationId: ctx.organizationId! });
  }

  @Delete('invites/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('user:invite')
  async revokeInvite(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ): Promise<void> {
    await this.revokeInviteUseCase.execute({
      inviteId: id,
      organizationId: ctx.organizationId!,
    });
  }
}
