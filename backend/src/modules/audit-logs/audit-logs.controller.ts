import { Controller, Get, Param, Query } from '@nestjs/common';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { TenantRequest } from '../../common/middleware/tenant-resolver.middleware';

import { InstituteRole } from '../../generated/prisma/enums';

import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

type CurrentTenantData = NonNullable<TenantRequest['tenant']>;

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  findAll(
    @CurrentTenant() tenant: CurrentTenantData,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.auditLogsService.findAll(tenant.id, query);
  }

  @Get(':auditLogId')
  @Protected(InstituteRole.INSTITUTE_ADMIN)
  findOne(
    @CurrentTenant() tenant: CurrentTenantData,
    @Param('auditLogId') auditLogId: string,
  ) {
    return this.auditLogsService.findOne(tenant.id, auditLogId);
  }
}
