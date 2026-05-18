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
import { CreateGuardianUseCase } from '../application/use-cases/create-guardian.use-case';
import { DeleteGuardianUseCase } from '../application/use-cases/delete-guardian.use-case';
import { FindGuardianUseCase } from '../application/use-cases/find-guardian.use-case';
import { ListGuardiansUseCase } from '../application/use-cases/list-guardians.use-case';
import { UpdateGuardianUseCase } from '../application/use-cases/update-guardian.use-case';

import { type CreateGuardianDto, createGuardianSchema } from './dtos/create-guardian.dto';
import { type UpdateGuardianDto, updateGuardianSchema } from './dtos/update-guardian.dto';

@Controller({ path: 'guardians', version: '1' })
export class GuardiansController {
  constructor(
    private readonly createGuardianUseCase: CreateGuardianUseCase,
    private readonly findGuardianUseCase: FindGuardianUseCase,
    private readonly listGuardiansUseCase: ListGuardiansUseCase,
    private readonly updateGuardianUseCase: UpdateGuardianUseCase,
    private readonly deleteGuardianUseCase: DeleteGuardianUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('guardian:create', 'guardian:create.own-school')
  async create(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(createGuardianSchema)) body: CreateGuardianDto,
  ) {
    return this.createGuardianUseCase.execute({
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Get()
  @RequirePermissions('guardian:read', 'guardian:read.own-school', 'guardian:read.own')
  async findAll(@CurrentUser() ctx: IRequestContext) {
    return this.listGuardiansUseCase.execute({
      organizationId: ctx.organizationId!,
    });
  }

  @Get(':id')
  @RequirePermissions('guardian:read', 'guardian:read.own-school', 'guardian:read.own')
  async findOne(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ) {
    return this.findGuardianUseCase.execute({
      guardianId: id,
      organizationId: ctx.organizationId!,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('guardian:update', 'guardian:update.own-school', 'guardian:update.own')
  async update(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGuardianSchema)) body: UpdateGuardianDto,
  ) {
    return this.updateGuardianUseCase.execute({
      guardianId: id,
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('guardian:delete')
  async remove(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteGuardianUseCase.execute({
      guardianId: id,
      organizationId: ctx.organizationId!,
    });
  }
}
