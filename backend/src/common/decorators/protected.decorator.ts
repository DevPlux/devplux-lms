import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { InstituteRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantContextGuard } from '../guards/tenant-context.guard';
import { TenantMembershipGuard } from '../guards/tenant-membership.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from './roles.decorator';

export function Protected(...roles: InstituteRole[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(
      JwtAuthGuard,
      TenantContextGuard,
      TenantMembershipGuard,
      RolesGuard,
    ),
  );
}
