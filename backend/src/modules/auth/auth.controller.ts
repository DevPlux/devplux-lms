import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenPayload } from './types/auth.types';
import { InstituteRole } from '../../generated/prisma/enums';
import { Protected } from '../../common/decorators/protected.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

import { Query } from '@nestjs/common';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: TenantRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto, request);

    response.cookie(
      this.getRefreshCookieName(),
      result.refreshToken,
      this.getRefreshCookieOptions(),
    );

    return {
      message: result.message,
      accessToken: result.accessToken,
      user: result.user,
      tenant: result.tenant,
      role: result.role,
    };
  }

  @Get('me')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  me(@CurrentUser() user: AccessTokenPayload) {
    return {
      user,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() request: TenantRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[this.getRefreshCookieName()];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token cookie missing');
    }

    const result = await this.authService.refresh(refreshToken);

    response.cookie(
      this.getRefreshCookieName(),
      result.refreshToken,
      this.getRefreshCookieOptions(),
    );

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  async logout(
    @Req() request: TenantRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[this.getRefreshCookieName()];

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    response.clearCookie(
      this.getRefreshCookieName(),
      this.getRefreshCookieOptions(),
    );

    return {
      message: 'Logged out successfully',
    };
  }

  @Post('forgot-password')
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() request: TenantRequest,
  ) {
    return this.authService.forgotPassword(dto.email, request);
  }

  @Get('reset-password/validate')
  validatePasswordReset(@Query('token') token: string) {
    return this.authService.validatePasswordResetToken(token);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: TenantRequest) {
    return this.authService.resetPassword(dto.token, dto.password, request);
  }

  private getRefreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('COOKIE_SECURE') === 'true',
      sameSite: (this.configService.get<string>('COOKIE_SAME_SITE') ??
        'lax') as 'lax' | 'strict' | 'none',
      path: '/api/v1/auth',
      maxAge: Number(
        this.configService.get<string>('COOKIE_REFRESH_MAX_AGE_MS') ??
          604800000,
      ),
    };
  }

  private getRefreshCookieName(): string {
    return (
      this.configService.get<string>('COOKIE_REFRESH_NAME') ?? 'refresh_token'
    );
  }
}
