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
import { CreateModalityUseCase } from '../application/use-cases/create-modality.use-case';
import { DeleteModalityUseCase } from '../application/use-cases/delete-modality.use-case';
import { FindModalityUseCase } from '../application/use-cases/find-modality.use-case';
import { ListModalitiesUseCase } from '../application/use-cases/list-modalities.use-case';
import { UpdateModalityUseCase } from '../application/use-cases/update-modality.use-case';

import { type CreateModalityDto, createModalitySchema } from './dtos/create-modality.dto';
import { type UpdateModalityDto, updateModalitySchema } from './dtos/update-modality.dto';

@Controller({ path: 'modalities', version: '1' })
export class ModalitiesController {
  constructor(
    private readonly createModalityUseCase: CreateModalityUseCase,
    private readonly listModalitiesUseCase: ListModalitiesUseCase,
    private readonly findModalityUseCase: FindModalityUseCase,
    private readonly updateModalityUseCase: UpdateModalityUseCase,
    private readonly deleteModalityUseCase: DeleteModalityUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('modality:create')
  async create(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(createModalitySchema)) body: CreateModalityDto,
  ) {
    return this.createModalityUseCase.execute({
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Get()
  @RequirePermissions('modality:read')
  async list(@CurrentUser() ctx: IRequestContext) {
    return this.listModalitiesUseCase.execute({ organizationId: ctx.organizationId! });
  }

  @Get(':id')
  @RequirePermissions('modality:read')
  async findOne(@CurrentUser() ctx: IRequestContext, @Param('id') id: string) {
    return this.findModalityUseCase.execute({
      modalityId: id,
      organizationId: ctx.organizationId!,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('modality:update')
  async update(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateModalitySchema)) body: UpdateModalityDto,
  ) {
    return this.updateModalityUseCase.execute({
      modalityId: id,
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('modality:delete')
  async remove(@CurrentUser() ctx: IRequestContext, @Param('id') id: string): Promise<void> {
    await this.deleteModalityUseCase.execute({
      modalityId: id,
      organizationId: ctx.organizationId!,
    });
  }
}
