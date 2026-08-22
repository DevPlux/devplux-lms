import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../database/prisma/prisma.service';
import type { AuthSession } from '../../generated/prisma/client';
import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';
import { LoginDto } from './dto/login.dto';

import type {
  LoginResult,
  LogoutResult,
  RefreshResult,
} from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    loginDto: LoginDto,
    request: TenantRequest,
  ): Promise<LoginResult> {
    const tenant = request.tenant;

    if (!tenant) {
      throw new UnauthorizedException('Tenant context not found');
    }

    const email = loginDto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException('User does not belong to this institute');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      tenantId: tenant.id,
      role: membership.role,
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        tenantId: tenant.id,
        role: membership.role,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as any,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        refreshTokenHash,
        expiresAt,
        userAgent: request.headers['user-agent'] ?? null,
        ipAddress: request.ip ?? null,
      },
    });

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      role: membership.role,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    let payload: {
      sub: string;
      tenantId: string;
      role: string;
      exp?: number;
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const sessions = await this.prisma.authSession.findMany({
      where: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let matchedSession: AuthSession | null = null;

    for (const session of sessions) {
      const matches = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );

      if (matches) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException('Refresh session not found');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: payload.sub,
          tenantId: payload.tenantId,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException(
        'User no longer belongs to this institute',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const newAccessToken = await this.jwtService.signAsync({
      sub: user.id,
      tenantId: payload.tenantId,
      role: membership.role,
    });

    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        tenantId: payload.tenantId,
        role: membership.role,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as any,
      },
    );

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.authSession.update({
      where: {
        id: matchedSession.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        tenantId: payload.tenantId,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<LogoutResult> {
    let payload: {
      sub: string;
      tenantId: string;
      role: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions = await this.prisma.authSession.findMany({
      where: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let matchedSession: AuthSession | null = null;

    for (const session of sessions) {
      const matches = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );

      if (matches) {
        matchedSession = session;
        break;
      }
    }

    if (matchedSession) {
      await this.prisma.authSession.update({
        where: {
          id: matchedSession.id,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return {
      message: 'Logged out successfully',
    };
  }
}
