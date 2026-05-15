import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { type Request, type Response } from 'express';

import { type Env } from '../../../infrastructure/config/env.schema';
import { type IRequestContext } from '../../../shared/context/request.context';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { AcceptInviteUseCase } from '../application/use-cases/accept-invite.use-case';
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { LogoutAllUseCase } from '../application/use-cases/logout-all.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { MeUseCase } from '../application/use-cases/me.use-case';
import { RefreshUseCase } from '../application/use-cases/refresh.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { SignupOrganizationUseCase } from '../application/use-cases/signup-organization.use-case';
import { VerifyEmailUseCase } from '../application/use-cases/verify-email.use-case';

import { type AcceptInviteDto, acceptInviteSchema } from './dtos/accept-invite.dto';
import { type ForgotPasswordDto, forgotPasswordSchema } from './dtos/forgot-password.dto';
import { type LoginDto, loginSchema } from './dtos/login.dto';
import { type ResetPasswordDto, resetPasswordSchema } from './dtos/reset-password.dto';
import { type SignupOrganizationDto, signupOrganizationSchema } from './dtos/signup-organization.dto';
import { type VerifyEmailDto, verifyEmailSchema } from './dtos/verify-email.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly isSecure: boolean;

  constructor(
    private readonly signupOrgUseCase: SignupOrganizationUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
    private readonly meUseCase: MeUseCase,
    config: ConfigService<Env, true>,
  ) {
    this.isSecure = config.get('NODE_ENV', { infer: true }) !== 'development';
  }

  @Public()
  @Post('signup-organization')
  @HttpCode(HttpStatus.CREATED)
  async signupOrganization(
    @Body(new ZodValidationPipe(signupOrganizationSchema)) body: SignupOrganizationDto,
  ) {
    return this.signupOrgUseCase.execute(body);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailDto,
  ): Promise<void> {
    await this.verifyEmailUseCase.execute(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute({
      ...body,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshCookieValue);

    return { userId: result.userId, roles: result.roles };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refreshTokens(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieValue = this.readRefreshCookie(req);
    if (!cookieValue) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException();
    }

    const result = await this.refreshUseCase.execute({
      refreshCookieValue: cookieValue,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshCookieValue);

    return { sessionId: result.sessionId };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutCurrent(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const sessionId = this.extractSessionIdFromCookie(req);
    if (sessionId) {
      await this.logoutUseCase.execute({ sessionId });
    }
    this.clearAuthCookies(res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentUser() ctx: IRequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.logoutAllUseCase.execute({ userId: ctx.userId! });
    this.clearAuthCookies(res);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordDto,
  ): Promise<void> {
    await this.forgotPasswordUseCase.execute(body);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.resetPasswordUseCase.execute(body);
    this.clearAuthCookies(res);
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.CREATED)
  async acceptInvite(
    @Body(new ZodValidationPipe(acceptInviteSchema)) body: AcceptInviteDto,
  ) {
    return this.acceptInviteUseCase.execute(body);
  }

  @Get('me')
  async getMe(@CurrentUser() ctx: IRequestContext) {
    return this.meUseCase.execute(ctx.userId!);
  }

  // ── Cookie helpers ──────────────────────────────────────────────────────────

  private get accessCookieName(): string {
    return this.isSecure ? '__Host-access' : 'access';
  }

  private get refreshCookieName(): string {
    return this.isSecure ? '__Host-refresh' : 'refresh';
  }

  private setAccessCookie(res: Response, token: string): void {
    res.cookie(this.accessCookieName, token, {
      httpOnly: true,
      secure: this.isSecure,
      sameSite: 'strict',
      path: '/',
    });
  }

  private setRefreshCookie(res: Response, cookieValue: string): void {
    res.cookie(this.refreshCookieName, cookieValue, {
      httpOnly: true,
      secure: this.isSecure,
      sameSite: 'strict',
      path: '/v1/auth/refresh',
    });
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[this.refreshCookieName];
  }

  private extractSessionIdFromCookie(req: Request): string | null {
    const cookieValue = this.readRefreshCookie(req);
    if (!cookieValue) return null;
    const idx = cookieValue.indexOf(':');
    return idx === -1 ? null : cookieValue.slice(0, idx);
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(this.accessCookieName, { path: '/' });
    res.clearCookie(this.refreshCookieName, { path: '/v1/auth/refresh' });
  }
}
