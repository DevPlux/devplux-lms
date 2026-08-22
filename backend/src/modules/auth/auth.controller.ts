import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: TenantRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto, request);

    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: result.message,
      accessToken: result.accessToken,
      user: result.user,
      tenant: result.tenant,
      role: result.role,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return {
      user,
    };
  }

  @Post('refresh')
  refresh(@Req() request: TenantRequest) {
    const refreshToken = request.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token cookie missing');
    }

    return this.authService.refresh(refreshToken);
  }
}
