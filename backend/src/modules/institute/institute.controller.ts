import { Body, Controller, Get, Patch } from '@nestjs/common';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import { InstituteRole } from '../../generated/prisma/enums';

import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';

import { InstituteService } from './institute.service';
import { UpdateInstituteProfileDto } from './dto/update-institute-profile.dto';

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
    @Body() updateInstituteProfileDto: UpdateInstituteProfileDto,
  ) {
    return this.instituteService.updateProfile(
      tenant.id,
      updateInstituteProfileDto,
    );
  }
}
