import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './database/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantDomainsModule } from './modules/tenant-domains/tenant-domains.module';
import { TenantResolverMiddleware } from './common/middleware/tenant-resolver.middleware';
import { UsersModule } from './modules/users/users.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { AuthModule } from './modules/auth/auth.module';
import { InstituteModule } from './modules/institute/institute.module';
import { InstituteUsersModule } from './modules/institute-users/institute-users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    TenantsModule,
    TenantDomainsModule,
    UsersModule,
    MembershipsModule,
    AuthModule,
    InstituteModule,
    InstituteUsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolverMiddleware).forRoutes(
      {
        path: 'tenant-test',
        method: RequestMethod.GET,
      },
      {
        path: 'auth/login',
        method: RequestMethod.POST,
      },
      {
        path: 'auth/me',
        method: RequestMethod.GET,
      },
      {
        path: 'institute/profile',
        method: RequestMethod.GET,
      },
      {
        path: 'institute/profile',
        method: RequestMethod.PATCH,
      },
      {
        path: 'institute-users',
        method: RequestMethod.GET,
      },
      {
        path: 'institute-users/:userId',
        method: RequestMethod.GET,
      },
      {
        path: 'institute-users',
        method: RequestMethod.POST,
      },
      {
        path: 'institute-users/:userId/role',
        method: RequestMethod.PATCH,
      },
      {
        path: 'institute-users/:userId/status',
        method: RequestMethod.PATCH,
      },
      {
        path: 'institute-users/:userId',
        method: RequestMethod.DELETE,
      },
    );
  }
}
