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
import { AssignCoachUseCase } from '../application/use-cases/assign-coach.use-case';
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case';
import { DeleteClassUseCase } from '../application/use-cases/delete-class.use-case';
import { FindClassUseCase } from '../application/use-cases/find-class.use-case';
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case';
import { RemoveCoachUseCase } from '../application/use-cases/remove-coach.use-case';
import { UpdateClassUseCase } from '../application/use-cases/update-class.use-case';

import { type AssignCoachDto, assignCoachSchema } from './dtos/assign-coach.dto';
import { type CreateClassDto, createClassSchema } from './dtos/create-class.dto';
import { type UpdateClassDto, updateClassSchema } from './dtos/update-class.dto';

@Controller({ path: 'classes', version: '1' })
export class ClassesController {
  constructor(
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly findClassUseCase: FindClassUseCase,
    private readonly listClassesUseCase: ListClassesUseCase,
    private readonly updateClassUseCase: UpdateClassUseCase,
    private readonly deleteClassUseCase: DeleteClassUseCase,
    private readonly assignCoachUseCase: AssignCoachUseCase,
    private readonly removeCoachUseCase: RemoveCoachUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('class:create', 'class:create.own-school')
  async create(
    @CurrentUser() ctx: IRequestContext,
    @Body(new ZodValidationPipe(createClassSchema)) body: CreateClassDto,
  ) {
    return this.createClassUseCase.execute({
      organizationId: ctx.organizationId!,
      schoolId: body.schoolId,
      schoolModalityId: body.schoolModalityId,
      name: body.name,
      ageGroup: body.ageGroup,
      schedule: body.schedule,
      location: body.location,
      capacity: body.capacity,
      monthlyFeeCents: body.monthlyFeeCents,
    });
  }

  @Get()
  @RequirePermissions('class:read', 'class:read.own-school')
  async list(
    @CurrentUser() ctx: IRequestContext,
    @Query('schoolId') schoolId?: string,
    @Query('schoolModalityId') schoolModalityId?: string,
  ) {
    return this.listClassesUseCase.execute({
      organizationId: ctx.organizationId!,
      schoolId,
      schoolModalityId,
    });
  }

  @Get(':id')
  @RequirePermissions('class:read', 'class:read.own-school', 'class:read.own')
  async findOne(@CurrentUser() ctx: IRequestContext, @Param('id') id: string) {
    return this.findClassUseCase.execute({
      classId: id,
      organizationId: ctx.organizationId!,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('class:update', 'class:update.own-school')
  async update(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClassSchema)) body: UpdateClassDto,
  ) {
    return this.updateClassUseCase.execute({
      classId: id,
      organizationId: ctx.organizationId!,
      ...body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('class:delete', 'class:delete.own-school')
  async remove(@CurrentUser() ctx: IRequestContext, @Param('id') id: string) {
    await this.deleteClassUseCase.execute({
      classId: id,
      organizationId: ctx.organizationId!,
    });
  }

  @Post(':id/coaches')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('class:assign-coach', 'class:assign-coach.own-school')
  async assignCoach(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignCoachSchema)) body: AssignCoachDto,
  ) {
    return this.assignCoachUseCase.execute({
      classId: id,
      userId: body.userId,
      organizationId: ctx.organizationId!,
    });
  }

  @Delete(':id/coaches/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('class:assign-coach', 'class:assign-coach.own-school')
  async removeCoach(
    @CurrentUser() ctx: IRequestContext,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.removeCoachUseCase.execute({
      classId: id,
      userId,
      organizationId: ctx.organizationId!,
    });
  }
}
