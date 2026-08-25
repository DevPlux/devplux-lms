import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { AuditAction } from './enums/audit-action.enum';

interface CreateAuditLogInput {
  tenantId: string;
  actorUserId?: string;
  action: AuditAction;

  targetType?: string;
  targetId?: string;

  metadata?: Prisma.InputJsonValue;

  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
