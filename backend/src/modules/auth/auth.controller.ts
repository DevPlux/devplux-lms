import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

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
  login(@Body() loginDto: LoginDto, @Req() request: TenantRequest) {
    return this.authService.login(loginDto, request);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return {
      user,
    };
  }
}
