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
  Query,
} from '@nestjs/common';

import { type IRequestContext } from '../../../shared/context/request.context';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateSchoolModalityUseCase } from '../application/use-cases/create-school-modality.use-case';
import { DeleteSchoolModalityUseCase } from '../application/use-cases/delete-school-modality.use-case';
import { FindSchoolModalityUseCase } from '../application/use-cases/find-school-modality.use-case';
import { ListSchoolModalitiesUseCase } from '../application/use-cases/list-school-modalities.use-case';
import { UpdateSchoolModalityUseCase } from '../application/use-cases/update-school-modality.use-case';

import {
  type CreateSchoolModalityDto,
  createSchoolModalitySchema,
} from './dtos/create-school-modality.dto';
import {
  type UpdateSchoolModalityDto,
  updateSchoolModalitySchema,
} from './dtos/update-school-modality.dto';

@Controller({ path: 'school-modalities', version: '1' })
export class SchoolModalitiesController {
  constructor(
    private readonly createSchoolModalityUseCase: CreateSchoolModalityUseCase,
    private readonly findSchoolModalityUseCase: FindSchoolModalityUseCase,
    private readonly listSchoolModalitiesUseCase: ListSchoolModalitiesUseCase,
    private readonly updateSchoolModalityUseCase: UpdateSchoolModalityUseCase,
    private readonly deleteSchoolModalityUseCase: DeleteSchoolModalityUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('school-modality:create', 'school-modality:create.own-school')
  async create(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(createSchoolModalitySchema)) body: CreateSchoolModalityDto,
  ) {
    return this.createSchoolModalityUseCase.execute({
      organizationId: ctx.organizationId!,
      schoolId: body.schoolId,
      modalityId: body.modalityId,
      defaultMonthlyFeeCents: body.defaultMonthlyFeeCents,
      defaultEnrollmentFeeCents: body.defaultEnrollmentFeeCents,
    });
  }

  @Get()
  @RequirePermissions('school-modality:read', 'school-modality:read.own-school')
  async list(@CurrentUser() ctx: IRequestContext, @Query('schoolId') schoolId?: string) {
    return this.listSchoolModalitiesUseCase.execute({
      organizationId: ctx.organizationId!,
      schoolId,
    });
  }

  @Get(':id')
  @RequirePermissions('school-modality:read', 'school-modality:read.own-school')
  async findOne(@CurrentUser() ctx: IRequestContext, @Param('id') id: string) {
    return this.findSchoolModalityUseCase.execute({
      id,
      organizationId: ctx.organizationId!,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('school-modality:update', 'school-modality:update.own-school')
  async update(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchoolModalitySchema)) body: UpdateSchoolModalityDto,
  ) {
    return this.updateSchoolModalityUseCase.execute({
      id,
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('school-modality:delete', 'school-modality:delete.own-school')
  async remove(@CurrentUser() ctx: IRequestContext, @Param('id') id: string) {
    await this.deleteSchoolModalityUseCase.execute({
      id,
      organizationId: ctx.organizationId!,
    });
  }
}
