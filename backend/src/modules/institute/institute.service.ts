import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';

import { UpdateInstituteProfileDto } from './dto/update-institute-profile.dto';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/enums/audit-action.enum';
import type { AuditContext } from '../audit-logs/types/audit-context.type';

@Injectable()
export class InstituteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getProfile(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
      include: {
        profile: true,
      },
    });
  }

  async updateProfile(
    tenantId: string,
    updateInstituteProfileDto: UpdateInstituteProfileDto,
    auditContext: AuditContext,
  ) {
    const existingProfile = await this.prisma.tenantProfile.findUnique({
      where: {
        tenantId,
      },
    });

    const updatedProfile = await this.prisma.tenantProfile.upsert({
      where: {
        tenantId,
      },
      update: {
        ...updateInstituteProfileDto,
      },
      create: {
        tenantId,
        ...updateInstituteProfileDto,
      },
    });

    const previousValues = {
      email: existingProfile?.email ?? null,
      phone: existingProfile?.phone ?? null,
      address: existingProfile?.address ?? null,
      website: existingProfile?.website ?? null,
      country: existingProfile?.country ?? null,
      timezone: existingProfile?.timezone ?? null,
      logoUrl: existingProfile?.logoUrl ?? null,
    };

    const newValues = {
      email: updatedProfile.email ?? null,
      phone: updatedProfile.phone ?? null,
      address: updatedProfile.address ?? null,
      website: updatedProfile.website ?? null,
      country: updatedProfile.country ?? null,
      timezone: updatedProfile.timezone ?? null,
      logoUrl: updatedProfile.logoUrl ?? null,
    };

    await this.auditLogsService.create({
      tenantId,
      actorUserId: auditContext.actorUserId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,

      action: AuditAction.INSTITUTE_PROFILE_UPDATED,

      targetType: 'TenantProfile',
      targetId: updatedProfile.id,

      metadata: {
        updatedFields: Object.keys(updateInstituteProfileDto),
        previousValues,
        newValues,
      },
    });

    return updatedProfile;
  }
}
