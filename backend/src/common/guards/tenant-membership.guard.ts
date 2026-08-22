import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import type { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authenticated user not found');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.sub,
          tenantId: user.tenantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('User no longer belongs to this institute');
    }

    user.role = membership.role;

    return true;
  }
}
