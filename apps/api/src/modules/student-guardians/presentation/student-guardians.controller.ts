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
import { LinkGuardianToStudentUseCase } from '../application/use-cases/link-guardian-to-student.use-case';
import { ListGuardiansForStudentUseCase } from '../application/use-cases/list-guardians-for-student.use-case';
import { ListStudentsForGuardianUseCase } from '../application/use-cases/list-students-for-guardian.use-case';
import { UnlinkGuardianFromStudentUseCase } from '../application/use-cases/unlink-guardian-from-student.use-case';
import { UpdateStudentGuardianUseCase } from '../application/use-cases/update-student-guardian.use-case';

import {
  type CreateStudentGuardianDto,
  createStudentGuardianSchema,
} from './dtos/create-student-guardian.dto';
import {
  type UpdateStudentGuardianDto,
  updateStudentGuardianSchema,
} from './dtos/update-student-guardian.dto';

@Controller({ path: 'student-guardians', version: '1' })
export class StudentGuardiansController {
  constructor(
    private readonly linkGuardianToStudentUseCase: LinkGuardianToStudentUseCase,
    private readonly listGuardiansForStudentUseCase: ListGuardiansForStudentUseCase,
    private readonly listStudentsForGuardianUseCase: ListStudentsForGuardianUseCase,
    private readonly updateStudentGuardianUseCase: UpdateStudentGuardianUseCase,
    private readonly unlinkGuardianFromStudentUseCase: UnlinkGuardianFromStudentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('student:update', 'student:update.own-school', 'student:update.own')
  async create(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(createStudentGuardianSchema)) body: CreateStudentGuardianDto,
  ) {
    return this.linkGuardianToStudentUseCase.execute({
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Get('student/:studentId')
  @RequirePermissions('student:read', 'student:read.own-school', 'student:read.own')
  async findByStudent(
    @CurrentUser() ctx: IRequestContext,
    @Param('studentId') studentId: string,
  ) {
    return this.listGuardiansForStudentUseCase.execute({
      organizationId: ctx.organizationId!,
      studentId,
    });
  }

  @Get('guardian/:guardianId')
  @RequirePermissions('student:read', 'student:read.own-school', 'student:read.own')
  async findByGuardian(
    @CurrentUser() ctx: IRequestContext,
    @Param('guardianId') guardianId: string,
  ) {
    return this.listStudentsForGuardianUseCase.execute({
      organizationId: ctx.organizationId!,
      guardianId,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('student:update', 'student:update.own-school', 'student:update.own')
  async update(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStudentGuardianSchema)) body: UpdateStudentGuardianDto,
  ) {
    return this.updateStudentGuardianUseCase.execute({
      id,
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('student:update', 'student:update.own-school', 'student:update.own')
  async remove(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
  ): Promise<void> {
    await this.unlinkGuardianFromStudentUseCase.execute({
      id,
      organizationId: ctx.organizationId!,
    });
  }
}
