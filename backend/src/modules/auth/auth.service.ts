import {
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  AuthSession,
  EmailDeliveryStatus,
  MembershipStatus,
  PasswordResetStatus,
} from '../../generated/prisma/client';
import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';
import { LoginDto } from './dto/login.dto';

import type {
  LoginResult,
  LogoutResult,
  RefreshResult,
} from './types/auth.types';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/enums/audit-action.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogsService,
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

    if (membership.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Your membership in this institute is not active',
      );
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

    if (membership.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Your membership in this institute is not active',
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

  async forgotPassword(emailInput: string, request: TenantRequest) {
    const tenant = request.tenant;

    if (!tenant) {
      throw new UnauthorizedException('Tenant context not found');
    }

    const email = emailInput.toLowerCase().trim();

    /*
     * Always return the same response.
     *
     * This prevents attackers from discovering
     * whether an email address exists.
     */
    const genericResponse = {
      message:
        'If an account exists for this email, a password reset link has been sent',
    };

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || !user.isActive) {
      return genericResponse;
    }

    /*
     * Password reset must only be allowed when
     * this user actively belongs to the institute
     * from which the request originated.
     */
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      return genericResponse;
    }

    /*
     * Revoke old pending password-reset tokens
     * for this user inside this tenant.
     */
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        tenantId: tenant.id,
        status: PasswordResetStatus.PENDING,
      },

      data: {
        status: PasswordResetStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    /*
     * Generate secure reset token.
     *
     * RAW token:
     *   sent through email
     *
     * HASH:
     *   stored in PostgreSQL
     */
    const rawToken = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    /*
     * Password reset link expires in 30 minutes.
     */
    const expiresAt = new Date();

    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    /*
     * Create password reset record.
     */
    const resetToken = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,

        tokenHash,

        status: PasswordResetStatus.PENDING,

        expiresAt,

        emailStatus: EmailDeliveryStatus.PENDING,
      },
    });

    /*
     * Audit:
     * password reset requested.
     *
     * actorUserId is intentionally absent because
     * this is a public unauthenticated endpoint.
     */
    await this.auditLogsService.create({
      tenantId: tenant.id,

      action: AuditAction.PASSWORD_RESET_REQUESTED,

      targetType: 'PasswordResetToken',

      targetId: resetToken.id,

      ipAddress: request.ip ?? undefined,

      userAgent: request.headers['user-agent'] ?? undefined,

      metadata: {
        affectedUserId: user.id,

        email: user.email,

        expiresAt: expiresAt.toISOString(),
      },
    });

    /*
     * Generate frontend reset URL.
     */
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    /*
     * Attempt email delivery.
     */
    try {
      await this.mailService.sendPasswordReset({
        to: user.email,
        firstName: user.firstName,
        resetUrl,
        expiresAt,
      });

      /*
       * Mark email as successfully sent.
       */
      const sentToken = await this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },

        data: {
          emailStatus: EmailDeliveryStatus.SENT,

          emailSentAt: new Date(),

          emailError: null,
        },
      });

      /*
       * Audit successful email delivery.
       */
      await this.auditLogsService.create({
        tenantId: tenant.id,

        action: AuditAction.PASSWORD_RESET_EMAIL_SENT,

        targetType: 'PasswordResetToken',

        targetId: sentToken.id,

        ipAddress: request.ip ?? undefined,

        userAgent: request.headers['user-agent'] ?? undefined,

        metadata: {
          affectedUserId: user.id,

          email: user.email,

          emailStatus: sentToken.emailStatus,

          emailSentAt: sentToken.emailSentAt?.toISOString() ?? null,
        },
      });
    } catch (error) {
      /*
       * Do NOT expose the email failure to the caller.
       */
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown email delivery error';

      const failedToken = await this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },

        data: {
          emailStatus: EmailDeliveryStatus.FAILED,

          emailSentAt: null,

          emailError: errorMessage,
        },
      });

      /*
       * Audit failed email delivery.
       */
      await this.auditLogsService.create({
        tenantId: tenant.id,

        action: AuditAction.PASSWORD_RESET_EMAIL_FAILED,

        targetType: 'PasswordResetToken',

        targetId: failedToken.id,

        ipAddress: request.ip ?? undefined,

        userAgent: request.headers['user-agent'] ?? undefined,

        metadata: {
          affectedUserId: user.id,

          email: user.email,

          emailStatus: failedToken.emailStatus,

          error: errorMessage,
        },
      });
    }

    /*
     * Same response regardless of account/email state.
     */
    return genericResponse;
  }

  async validatePasswordResetToken(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,

        status: PasswordResetStatus.PENDING,
      },

      include: {
        user: {
          select: {
            email: true,
            firstName: true,
          },
        },

        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!resetToken) {
      throw new NotFoundException(
        'Password reset token not found or already used',
      );
    }

    /*
     * Check expiry.
     */
    if (resetToken.expiresAt <= new Date()) {
      await this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },

        data: {
          status: PasswordResetStatus.EXPIRED,
        },
      });

      throw new GoneException('Password reset token has expired');
    }

    return {
      valid: true,

      email: resetToken.user.email,

      firstName: resetToken.user.firstName,

      expiresAt: resetToken.expiresAt,

      tenant: resetToken.tenant,
    };
  }

  async resetPassword(
    rawToken: string,
    password: string,
    request: TenantRequest,
  ) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,

        status: PasswordResetStatus.PENDING,
      },
    });

    if (!resetToken) {
      throw new NotFoundException(
        'Password reset token not found or already used',
      );
    }

    /*
     * Check expiration.
     */
    if (resetToken.expiresAt <= new Date()) {
      await this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },

        data: {
          status: PasswordResetStatus.EXPIRED,
        },
      });

      throw new GoneException('Password reset token has expired');
    }

    /*
     * Hash the new password.
     */
    const passwordHash = await bcrypt.hash(password, 12);

    /*
     * Perform security-sensitive database
     * changes atomically.
     */
    const result = await this.prisma.$transaction(async (tx) => {
      /*
       * Update password.
       */
      await tx.user.update({
        where: {
          id: resetToken.userId,
        },

        data: {
          passwordHash,
        },
      });

      /*
       * Consume this reset token.
       */
      const usedToken = await tx.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },

        data: {
          status: PasswordResetStatus.USED,

          usedAt: new Date(),
        },
      });

      /*
       * Revoke any other pending reset tokens.
       *
       * Password belongs to the global User,
       * therefore old reset links should no longer
       * remain usable after a successful reset.
       */
      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,

          status: PasswordResetStatus.PENDING,

          id: {
            not: resetToken.id,
          },
        },

        data: {
          status: PasswordResetStatus.REVOKED,

          revokedAt: new Date(),
        },
      });

      /*
       * Revoke every currently active session
       * belonging to this user.
       *
       * This intentionally applies across tenants.
       */
      const sessionResult = await tx.authSession.updateMany({
        where: {
          userId: resetToken.userId,

          revokedAt: null,
        },

        data: {
          revokedAt: new Date(),
        },
      });

      return {
        usedToken,
        revokedSessionCount: sessionResult.count,
      };
    });

    /*
     * Audit successful password reset.
     */
    await this.auditLogsService.create({
      tenantId: resetToken.tenantId,

      action: AuditAction.PASSWORD_RESET_COMPLETED,

      targetType: 'User',

      targetId: resetToken.userId,

      ipAddress: request.ip ?? undefined,

      userAgent: request.headers['user-agent'] ?? undefined,

      metadata: {
        affectedUserId: resetToken.userId,

        passwordResetTokenId: result.usedToken.id,

        revokedSessionCount: result.revokedSessionCount,
      },
    });

    return {
      message: 'Password reset successfully. Please sign in again.',
    };
  }

  async getMe(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },

      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new UnauthorizedException('Active institute membership not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },

      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },

      role: membership.role,
    };
  }
}
