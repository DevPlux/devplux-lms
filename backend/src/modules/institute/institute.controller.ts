import { Body, Controller, Get, Patch, Req } from '@nestjs/common';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import { InstituteRole } from '../../generated/prisma/enums';

import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';

import { InstituteService } from './institute.service';
import { UpdateInstituteProfileDto } from './dto/update-institute-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/auth.types';

type CurrentTenantData = NonNullable<TenantRequest['tenant']>;

@Controller('institute')
export class InstituteController {
  constructor(private readonly instituteService: InstituteService) {}

  @Get('profile')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  getProfile(@CurrentTenant() tenant: CurrentTenantData) {
    return this.instituteService.getProfile(tenant.id);
  }

  @Patch('profile')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  updateProfile(
    @CurrentTenant() tenant: CurrentTenantData,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Req() request: TenantRequest,
    @Body()
    updateInstituteProfileDto: UpdateInstituteProfileDto,
  ) {
    return this.instituteService.updateProfile(
      tenant.id,
      updateInstituteProfileDto,
      {
        actorUserId: currentUser.sub,
        ipAddress: request.ip ?? undefined,
        userAgent: request.headers['user-agent'] ?? undefined,
      },
    );
  }
}
