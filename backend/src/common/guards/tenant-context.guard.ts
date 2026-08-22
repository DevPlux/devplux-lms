import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { TenantRequest } from '../middleware/tenant-resolver.middleware';
import type { AuthenticatedRequest } from './jwt-auth.guard';

type TenantAuthenticatedRequest = TenantRequest & AuthenticatedRequest;

@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<TenantAuthenticatedRequest>();

    const tenant = request.tenant;
    const user = request.user;

    if (!tenant) {
      throw new ForbiddenException('Tenant context not found');
    }

    if (!user) {
      throw new ForbiddenException('Authenticated user not found');
    }

    if (tenant.id !== user.tenantId) {
      throw new ForbiddenException(
        'Authenticated user does not belong to this tenant context',
      );
    }

    return true;
  }
}
