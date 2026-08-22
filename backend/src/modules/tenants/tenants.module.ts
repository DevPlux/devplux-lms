import { Module } from '@nestjs/common';

import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantTestController } from './tenant-test.controller';

@Module({
  controllers: [TenantsController, TenantTestController],
  providers: [TenantsService],
})
export class TenantsModule {}
