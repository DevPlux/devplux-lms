import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { MailModule } from '../mail/mail.module';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantMembershipGuard } from '../../common/guards/tenant-membership.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';

import type { StringValue } from 'ms';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule,

    MailModule,

    forwardRef(() => AuditLogsModule),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),

        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            'JWT_ACCESS_EXPIRES_IN',
          ) as StringValue,
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    TenantMembershipGuard,
    TenantContextGuard,
  ],

  exports: [AuthService, JwtModule],
})
export class AuthModule {}
