import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import { type Request } from 'express';

import { type IRequestContext } from '../../../shared/context/request.context';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { ListConsentsUseCase } from '../application/use-cases/list-consents.use-case';
import { RecordConsentUseCase } from '../application/use-cases/record-consent.use-case';
import { RevokeConsentUseCase } from '../application/use-cases/revoke-consent.use-case';

import {
  type RecordConsentDto,
  type RevokeConsentDto,
  recordConsentSchema,
  revokeConsentSchema,
} from './dtos/consent.dto';

// No dedicated `consent:*` keys exist in the permission catalog (03-AUTH);
// consent management is gated by the guardian permissions it concerns.
@Controller({ path: 'consents', version: '1' })
export class ConsentsController {
  constructor(
    private readonly recordConsent: RecordConsentUseCase,
    private readonly revokeConsent: RevokeConsentUseCase,
    private readonly listConsents: ListConsentsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('guardian:update', 'guardian:update.own-school', 'guardian:update.own')
  async record(
    @CurrentUser() ctx: IRequestContext,
    @Req() req: Request,
    @Body(new ZodValidationPipe(recordConsentSchema)) body: RecordConsentDto,
  ) {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = forwarded?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
    return this.recordConsent.execute({
      organizationId: ctx.organizationId!,
      ip,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      ...body,
    });
  }

  @Post('revoke')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('guardian:update', 'guardian:update.own-school', 'guardian:update.own')
  async revoke(
    @CurrentUser() ctx: IRequestContext,
    @Req() req: Request,
    @Body(new ZodValidationPipe(revokeConsentSchema)) body: RevokeConsentDto,
  ) {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = forwarded?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
    return this.revokeConsent.execute({
      organizationId: ctx.organizationId!,
      ip,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      ...body,
    });
  }

  @Get()
  @RequirePermissions('guardian:read', 'guardian:read.own-school', 'guardian:read.own')
  async list(
    @CurrentUser() ctx: IRequestContext,
    @Query('guardianId') guardianId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.listConsents.execute({
      organizationId: ctx.organizationId!,
      guardianId,
      studentId,
    });
  }
}
