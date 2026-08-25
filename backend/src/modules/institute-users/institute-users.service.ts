import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../database/prisma/prisma.service';

import { InstituteRole, MembershipStatus } from '../../generated/prisma/enums';

import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { QueryInstituteUsersDto } from './dto/query-institute-users.dto';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/enums/audit-action.enum';
import type { AuditContext } from '../audit-logs/types/audit-context.type';

@Injectable()
export class InstituteUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(tenantId: string, query: QueryInstituteUsersDto) {
    const { page, limit, search, role, status } = query;

    const skip = (page - 1) * limit;

    const where = {
      tenantId,

      ...(role && {
        role,
      }),

      ...(status && {
        status,
      }),

      ...(search && {
        user: {
          OR: [
            {
              email: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              firstName: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              lastName: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          ],
        },
      }),
    };

    const [memberships, total] = await this.prisma.$transaction([
      this.prisma.membership.findMany({
        where,
        skip,
        take: limit,

        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.membership.count({
        where,
      }),
    ]);

    return {
      data: memberships,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },

      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in this institute');
    }

    return membership;
  }

  async create(
    tenantId: string,
    createInstituteUserDto: CreateInstituteUserDto,
    auditContext: AuditContext,
  ) {
    const email = createInstituteUserDto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    /*
     * CASE 1:
     * User already exists globally,
     * but may not belong to this tenant yet.
     */
    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: existingUser.id,
            tenantId,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException('User already belongs to this institute');
      }

      const membership = await this.prisma.membership.create({
        data: {
          userId: existingUser.id,
          tenantId,
          role: createInstituteUserDto.role,
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
        },
      });

      await this.auditLogsService.create({
        tenantId,
        actorUserId: auditContext.actorUserId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,

        action: AuditAction.INSTITUTE_USER_ADDED,

        targetType: 'Membership',
        targetId: membership.id,

        metadata: {
          affectedUserId: existingUser.id,
          role: membership.role,
          existingUser: true,
        },
      });

      return membership;
    }

    /*
     * CASE 2:
     * Completely new global User.
     */
    const passwordHash = await bcrypt.hash(createInstituteUserDto.password, 12);

    const membership = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,

          firstName: createInstituteUserDto.firstName.trim(),

          lastName: createInstituteUserDto.lastName.trim(),

          passwordHash,
        },
      });

      return tx.membership.create({
        data: {
          userId: user.id,
          tenantId,
          role: createInstituteUserDto.role,
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
        },
      });
    });

    await this.auditLogsService.create({
      tenantId,
      actorUserId: auditContext.actorUserId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,

      action: AuditAction.INSTITUTE_USER_ADDED,

      targetType: 'Membership',
      targetId: membership.id,

      metadata: {
        affectedUserId: membership.userId,
        role: membership.role,
        existingUser: false,
      },
    });

    return membership;
  }

  async updateRole(
    tenantId: string,
    userId: string,
    role: InstituteRole,
    auditContext: AuditContext,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in this institute');
    }

    if (role !== InstituteRole.INSTITUTE_ADMIN) {
      await this.ensureNotLastActiveAdmin(tenantId, userId);
    }

    const updatedMembership = await this.prisma.membership.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },

      data: {
        role,
      },

      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });

    await this.auditLogsService.create({
      tenantId,
      actorUserId: auditContext.actorUserId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,

      action: AuditAction.MEMBERSHIP_ROLE_CHANGED,

      targetType: 'Membership',
      targetId: membership.id,

      metadata: {
        oldRole: membership.role,
        newRole: role,
        affectedUserId: userId,
      },
    });

    return updatedMembership;
  }

  async updateStatus(
    tenantId: string,
    userId: string,
    status: MembershipStatus,
    auditContext: AuditContext,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in this institute');
    }

    if (status !== MembershipStatus.ACTIVE) {
      await this.ensureNotLastActiveAdmin(tenantId, userId);
    }

    const updatedMembership = await this.prisma.membership.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },

      data: {
        status,
      },

      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });

    await this.auditLogsService.create({
      tenantId,
      actorUserId: auditContext.actorUserId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,

      action: AuditAction.MEMBERSHIP_STATUS_CHANGED,

      targetType: 'Membership',
      targetId: membership.id,

      metadata: {
        oldStatus: membership.status,
        newStatus: status,
        affectedUserId: userId,
      },
    });

    return updatedMembership;
  }

  async removeFromInstitute(
    tenantId: string,
    userId: string,
    auditContext: AuditContext,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in this institute');
    }

    await this.ensureNotLastActiveAdmin(tenantId, userId);

    await this.prisma.authSession.updateMany({
      where: {
        userId,
        tenantId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      tenantId,
      actorUserId: auditContext.actorUserId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,

      action: AuditAction.MEMBERSHIP_REMOVED,

      targetType: 'Membership',
      targetId: membership.id,

      metadata: {
        affectedUserId: userId,
        removedRole: membership.role,
        removedStatus: membership.status,
      },
    });

    await this.prisma.membership.delete({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    return {
      message: 'User removed from institute successfully',
    };
  }

  async findSessions(tenantId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in this institute');
    }

    return this.prisma.authSession.findMany({
      where: {
        userId,
        tenantId,
      },

      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        revokedAt: true,
        userAgent: true,
        ipAddress: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async revokeSession(
    tenantId: string,
    userId: string,
    sessionId: string,
    auditContext: AuditContext,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in this institute');
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        id: sessionId,
        userId,
        tenantId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found for this user');
    }

    if (session.revokedAt) {
      return {
        message: 'Session is already revoked',
      };
    }

    await this.prisma.authSession.update({
      where: {
        id: session.id,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      tenantId,
      actorUserId: auditContext.actorUserId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,

      action: AuditAction.SESSION_REVOKED,

      targetType: 'AuthSession',
      targetId: session.id,

      metadata: {
        affectedUserId: userId,
        sessionId: session.id,

        sessionIpAddress: session.ipAddress,

        sessionUserAgent: session.userAgent,
      },
    });

    return {
      message: 'Session revoked successfully',
    };
  }

  async revokeAllSessions(
    tenantId: string,
    userId: string,
    auditContext: AuditContext,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in this institute');
    }

    const result = await this.prisma.authSession.updateMany({
      where: {
        userId,
        tenantId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      tenantId,
      actorUserId: auditContext.actorUserId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,

      action: AuditAction.ALL_SESSIONS_REVOKED,

      targetType: 'User',
      targetId: userId,

      metadata: {
        affectedUserId: userId,
        revokedSessions: result.count,
      },
    });

    return {
      message: 'All sessions revoked successfully',

      revokedSessions: result.count,
    };
  }

  private async ensureNotLastActiveAdmin(tenantId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in this institute');
    }

    if (
      membership.role !== InstituteRole.INSTITUTE_ADMIN ||
      membership.status !== MembershipStatus.ACTIVE
    ) {
      return;
    }

    const activeAdminCount = await this.prisma.membership.count({
      where: {
        tenantId,
        role: InstituteRole.INSTITUTE_ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (activeAdminCount <= 1) {
      throw new ConflictException(
        'Cannot modify the last active institute admin',
      );
    }
  }
}
