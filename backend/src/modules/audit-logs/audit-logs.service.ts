import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { InvitationStatus, Prisma } from '../../generated/prisma/client';
import { AuditAction } from './enums/audit-action.enum';

import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { AuditContext } from './types/audit-context.type';

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

  async findAll(tenantId: string, query: QueryAuditLogsDto) {
    const { page, limit, action, actorUserId, targetType, from, to } = query;

    const skip = (page - 1) * limit;

    const where = {
      tenantId,

      ...(action && {
        action,
      }),

      ...(actorUserId && {
        actorUserId,
      }),

      ...(targetType && {
        targetType,
      }),

      ...((from || to) && {
        createdAt: {
          ...(from && {
            gte: new Date(from),
          }),
          ...(to && {
            lte: new Date(to),
          }),
        },
      }),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,

        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.auditLog.count({
        where,
      }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, auditLogId: string) {
    const log = await this.prisma.auditLog.findFirst({
      where: {
        id: auditLogId,
        tenantId,
      },

      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log;
  }
}
