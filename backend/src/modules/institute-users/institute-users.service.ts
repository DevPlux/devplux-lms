import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { InstituteRole, MembershipStatus } from '../../generated/prisma/enums';
import { QueryInstituteUsersDto } from './dto/query-institute-users.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/enums/audit-action.enum';

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
  ) {
    const email = createInstituteUserDto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

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

      return membership;
    }

    const passwordHash = await bcrypt.hash(createInstituteUserDto.password, 12);

    return this.prisma.$transaction(async (tx) => {
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
  }

  async updateRole(
    tenantId: string,
    userId: string,
    role: InstituteRole,
    actorUserId: string,
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
      actorUserId,
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
    actorUserId: string,
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
      actorUserId,
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
    actorUserId: string,
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
      actorUserId,
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

  async revokeSession(tenantId: string, userId: string, sessionId: string) {
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

    return {
      message: 'Session revoked successfully',
    };
  }

  async revokeAllSessions(tenantId: string, userId: string) {
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
        'Cannot remove or suspend the last active institute admin',
      );
    }
  }
}
