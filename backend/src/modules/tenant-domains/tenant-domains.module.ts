import { Module } from '@nestjs/common';

import { TenantDomainsController } from './tenant-domains.controller';
import { TenantDomainsService } from './tenant-domains.service';

@Module({
  controllers: [TenantDomainsController],
  providers: [TenantDomainsService],
})
export class TenantDomainsModule {}
