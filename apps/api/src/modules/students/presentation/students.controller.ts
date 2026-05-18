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
import { AnonymizeStudentUseCase } from '../application/use-cases/anonymize-student.use-case';
import { CreateStudentUseCase } from '../application/use-cases/create-student.use-case';
import { DeleteStudentUseCase } from '../application/use-cases/delete-student.use-case';
import { FindStudentUseCase } from '../application/use-cases/find-student.use-case';
import { ListStudentsUseCase } from '../application/use-cases/list-students.use-case';
import { UpdateStudentUseCase } from '../application/use-cases/update-student.use-case';

import { type CreateStudentDto, createStudentSchema } from './dtos/create-student.dto';
import {
  type ListStudentsQueryDto,
  listStudentsQuerySchema,
} from './dtos/list-students-query.dto';
import { type UpdateStudentDto, updateStudentSchema } from './dtos/update-student.dto';

@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(
    private readonly createStudentUseCase: CreateStudentUseCase,
    private readonly findStudentUseCase: FindStudentUseCase,
    private readonly listStudentsUseCase: ListStudentsUseCase,
    private readonly updateStudentUseCase: UpdateStudentUseCase,
    private readonly deleteStudentUseCase: DeleteStudentUseCase,
    private readonly anonymizeStudentUseCase: AnonymizeStudentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('student:create', 'student:create.own-school')
  async create(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(createStudentSchema)) body: CreateStudentDto,
  ) {
    return this.createStudentUseCase.execute({
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Get()
  @RequirePermissions('student:read', 'student:read.own-school', 'student:read.own')
  async findAll(
    @CurrentUser() ctx: IRequestContext,
    @Query(new ZodValidationPipe(listStudentsQuerySchema)) query: ListStudentsQueryDto,
  ) {
    return this.listStudentsUseCase.execute({
      organizationId: ctx.organizationId!,
      search: query.search,
      status: query.status,
    });
  }

  @Get(':id')
  @RequirePermissions('student:read', 'student:read.own-school', 'student:read.own')
  async findOne(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ) {
    return this.findStudentUseCase.execute({
      studentId: id,
      organizationId: ctx.organizationId!,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('student:update', 'student:update.own-school', 'student:update.own')
  async update(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) body: UpdateStudentDto,
  ) {
    return this.updateStudentUseCase.execute({
      studentId: id,
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('student:delete', 'student:delete.own-school')
  async remove(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteStudentUseCase.execute({
      studentId: id,
      organizationId: ctx.organizationId!,
    });
  }

  @Post(':id/anonymize')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('student:anonymize')
  async anonymize(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ): Promise<{ anonymized: true }> {
    await this.anonymizeStudentUseCase.execute({
      studentId: id,
      organizationId: ctx.organizationId!,
    });
    return { anonymized: true };
  }
}
