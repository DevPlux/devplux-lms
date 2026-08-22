import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateTenantDomainDto } from './dto/create-tenant-domain.dto';
import { TenantDomainsService } from './tenant-domains.service';

@Controller('tenant-domains')
export class TenantDomainsController {
  constructor(private readonly tenantDomainsService: TenantDomainsService) {}

  @Post()
  create(@Body() createTenantDomainDto: CreateTenantDomainDto) {
    return this.tenantDomainsService.create(createTenantDomainDto);
  }

  @Get('tenant/:tenantId')
  findByTenant(@Param('tenantId') tenantId: string) {
    return this.tenantDomainsService.findByTenant(tenantId);
  }

  @Get('hostname/:hostname')
  findByHostname(@Param('hostname') hostname: string) {
    return this.tenantDomainsService.findByHostname(hostname);
  }
}
