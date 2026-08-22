import { Controller, Get, Req } from '@nestjs/common';

import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';

@Controller('tenant-test')
export class TenantTestController {
  @Get()
  getTenant(@Req() req: TenantRequest) {
    return {
      message: 'Tenant resolved successfully',
      tenant: req.tenant,
    };
  }
}
