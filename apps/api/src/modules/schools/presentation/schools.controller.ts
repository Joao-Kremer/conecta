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
import { CreateSchoolUseCase } from '../application/use-cases/create-school.use-case';
import { DeleteSchoolUseCase } from '../application/use-cases/delete-school.use-case';
import { FindSchoolUseCase } from '../application/use-cases/find-school.use-case';
import { ListSchoolsUseCase } from '../application/use-cases/list-schools.use-case';
import { UpdateSchoolUseCase } from '../application/use-cases/update-school.use-case';

import { type CreateSchoolDto, createSchoolSchema } from './dtos/create-school.dto';
import { type UpdateSchoolDto, updateSchoolSchema } from './dtos/update-school.dto';

@Controller({ path: 'schools', version: '1' })
export class SchoolsController {
  constructor(
    private readonly createSchoolUseCase: CreateSchoolUseCase,
    private readonly findSchoolUseCase: FindSchoolUseCase,
    private readonly listSchoolsUseCase: ListSchoolsUseCase,
    private readonly updateSchoolUseCase: UpdateSchoolUseCase,
    private readonly deleteSchoolUseCase: DeleteSchoolUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('school:create')
  async create(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(createSchoolSchema)) body: CreateSchoolDto,
  ) {
    return this.createSchoolUseCase.execute({
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Get()
  @RequirePermissions('school:read', 'school:read.own-school')
  async findAll(@CurrentUser() ctx: IRequestContext) {
    return this.listSchoolsUseCase.execute({
      organizationId: ctx.organizationId!,
      scopedSchoolIds: ctx.scopedSchoolIds,
    });
  }

  @Get(':id')
  @RequirePermissions('school:read', 'school:read.own-school')
  async findOne(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ) {
    return this.findSchoolUseCase.execute({
      schoolId: id,
      organizationId: ctx.organizationId!,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('school:update')
  async update(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchoolSchema)) body: UpdateSchoolDto,
  ) {
    return this.updateSchoolUseCase.execute({
      schoolId: id,
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('school:delete')
  async remove(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteSchoolUseCase.execute({
      schoolId: id,
      organizationId: ctx.organizationId!,
    });
  }
}
