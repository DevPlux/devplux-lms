import { Controller, Get } from '@nestjs/common';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('tenant-test')
export class TenantTestController {
  @Get()
  getTenant(@CurrentTenant() tenant: unknown) {
    return {
      message: 'Tenant resolved successfully',
      tenant,
    };
  }
}
