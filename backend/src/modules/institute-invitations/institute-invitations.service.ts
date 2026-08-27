import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../database/prisma/prisma.service';

import {
  InvitationEmailStatus,
  InvitationStatus,
  MembershipStatus,
} from '../../generated/prisma/enums';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/enums/audit-action.enum';
import type { AuditContext } from '../audit-logs/types/audit-context.type';

import { MailService } from '../mail/mail.service';

import { CreateInstituteInvitationDto } from './dto/create-institute-invitation.dto';
import { AcceptInstituteInvitationDto } from './dto/accept-institute-invitation.dto';
import { QueryInstituteInvitationsDto } from './dto/query-institute-invitations.dto';

@Injectable()
export class InstituteInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mailService: MailService,
  ) {}

  async create(
    tenantId: string,
    invitedByUserId: string,
    dto: CreateInstituteInvitationDto,
    auditContext: AuditContext,
  ) {
    const email = dto.email.toLowerCase().trim();

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

      if (
        existingMembership &&
        existingMembership.status === MembershipStatus.ACTIVE
      ) {
        throw new ConflictException('User already belongs to this institute');
      }
    }

    const existingInvitation = await this.prisma.instituteInvitation.findFirst({
      where: {
        tenantId,
        email,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'A pending invitation already exists for this email',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
      select: {
        name: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Institute not found');
    }

    const rawToken = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const invitation = await this.prisma.instituteInvitation.create({
      data: {
        tenantId,
        invitedByUserId,

        email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),

        role: dto.role,
        status: InvitationStatus.PENDING,

        tokenHash,
        expiresAt,

        emailStatus: InvitationEmailStatus.PENDING,
      },
    });

    await this.auditLogsService.create({
      tenantId,

      actorUserId: auditContext.actorUserId,

      ipAddress: auditContext.ipAddress,

      userAgent: auditContext.userAgent,

      action: AuditAction.INSTITUTE_INVITATION_CREATED,

      targetType: 'InstituteInvitation',

      targetId: invitation.id,

      metadata: {
        email,
        role: dto.role,
        expiresAt: expiresAt.toISOString(),
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    const invitationUrl = `${frontendUrl}/accept-invitation?token=${rawToken}`;

    try {
      await this.mailService.sendInstituteInvitation({
        to: invitation.email,
        firstName: invitation.firstName,
        instituteName: tenant.name,
        role: invitation.role,
        invitationUrl,
        expiresAt: invitation.expiresAt,
      });

      const sentInvitation = await this.prisma.instituteInvitation.update({
        where: {
          id: invitation.id,
        },

        data: {
          emailStatus: InvitationEmailStatus.SENT,

          emailSentAt: new Date(),

          emailError: null,
        },
      });

      await this.auditLogsService.create({
        tenantId,

        actorUserId: auditContext.actorUserId,

        ipAddress: auditContext.ipAddress,

        userAgent: auditContext.userAgent,

        action: AuditAction.INSTITUTE_INVITATION_EMAIL_SENT,

        targetType: 'InstituteInvitation',

        targetId: sentInvitation.id,

        metadata: {
          email: sentInvitation.email,

          role: sentInvitation.role,

          emailStatus: sentInvitation.emailStatus,

          emailSentAt: sentInvitation.emailSentAt?.toISOString() ?? null,

          source: 'CREATE',
        },
      });

      return {
        message: 'Invitation created and email sent successfully',

        invitation: {
          id: sentInvitation.id,

          email: sentInvitation.email,

          firstName: sentInvitation.firstName,

          lastName: sentInvitation.lastName,

          role: sentInvitation.role,

          status: sentInvitation.status,

          expiresAt: sentInvitation.expiresAt,

          emailStatus: sentInvitation.emailStatus,

          emailSentAt: sentInvitation.emailSentAt,

          emailError: sentInvitation.emailError,
        },

        // DEVELOPMENT ONLY
        invitationUrl,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown email delivery error';

      const failedInvitation = await this.prisma.instituteInvitation.update({
        where: {
          id: invitation.id,
        },

        data: {
          emailStatus: InvitationEmailStatus.FAILED,

          emailSentAt: null,

          emailError: errorMessage,
        },
      });

      await this.auditLogsService.create({
        tenantId,

        actorUserId: auditContext.actorUserId,

        ipAddress: auditContext.ipAddress,

        userAgent: auditContext.userAgent,

        action: AuditAction.INSTITUTE_INVITATION_EMAIL_FAILED,

        targetType: 'InstituteInvitation',

        targetId: failedInvitation.id,

        metadata: {
          email: failedInvitation.email,

          role: failedInvitation.role,

          emailStatus: failedInvitation.emailStatus,

          error: errorMessage,

          source: 'CREATE',
        },
      });

      return {
        message: 'Invitation created, but email delivery failed',

        invitation: {
          id: failedInvitation.id,

          email: failedInvitation.email,

          firstName: failedInvitation.firstName,

          lastName: failedInvitation.lastName,

          role: failedInvitation.role,

          status: failedInvitation.status,

          expiresAt: failedInvitation.expiresAt,

          emailStatus: failedInvitation.emailStatus,

          emailSentAt: failedInvitation.emailSentAt,

          emailError: failedInvitation.emailError,
        },

        // DEVELOPMENT ONLY
        invitationUrl,
      };
    }
  }

  async validateInvitation(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.prisma.instituteInvitation.findFirst({
      where: {
        tokenHash,
        status: InvitationStatus.PENDING,
      },

      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    if (invitation.expiresAt <= new Date()) {
      await this.prisma.instituteInvitation.update({
        where: {
          id: invitation.id,
        },

        data: {
          status: InvitationStatus.EXPIRED,
        },
      });

      throw new GoneException('Invitation has expired');
    }

    return {
      valid: true,

      invitation: {
        email: invitation.email,

        firstName: invitation.firstName,

        lastName: invitation.lastName,

        role: invitation.role,

        expiresAt: invitation.expiresAt,

        tenant: invitation.tenant,
      },
    };
  }

  async accept(dto: AcceptInstituteInvitationDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.prisma.instituteInvitation.findFirst({
      where: {
        tokenHash,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    if (invitation.expiresAt <= new Date()) {
      await this.prisma.instituteInvitation.update({
        where: {
          id: invitation.id,
        },

        data: {
          status: InvitationStatus.EXPIRED,
        },
      });

      throw new GoneException('Invitation has expired');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: invitation.email,
      },
    });

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: existingUser.id,

            tenantId: invitation.tenantId,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException('User already belongs to this institute');
      }
    } else {
      const passwordHash = await bcrypt.hash(dto.password, 12);

      const newUser = await this.prisma.user.create({
        data: {
          email: invitation.email,

          firstName: invitation.firstName,

          lastName: invitation.lastName,

          passwordHash,
        },
      });

      userId = newUser.id;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          userId,

          tenantId: invitation.tenantId,

          role: invitation.role,

          status: MembershipStatus.ACTIVE,
        },
      });

      const acceptedInvitation = await tx.instituteInvitation.update({
        where: {
          id: invitation.id,
        },

        data: {
          status: InvitationStatus.ACCEPTED,

          acceptedAt: new Date(),
        },
      });

      return {
        membership,
        acceptedInvitation,
      };
    });

    return {
      message: 'Invitation accepted successfully',

      membership: {
        id: result.membership.id,

        tenantId: result.membership.tenantId,

        role: result.membership.role,

        status: result.membership.status,
      },
    };
  }

  async findAll(tenantId: string, query: QueryInstituteInvitationsDto) {
    const { page, limit, status, search } = query;

    const skip = (page - 1) * limit;

    const where = {
      tenantId,

      ...(status && {
        status,
      }),

      ...(search && {
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
      }),
    };

    const [invitations, total] = await this.prisma.$transaction([
      this.prisma.instituteInvitation.findMany({
        where,

        skip,
        take: limit,

        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,

          status: true,

          emailStatus: true,
          emailSentAt: true,
          emailError: true,

          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,

          createdAt: true,
          updatedAt: true,

          invitedBy: {
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

      this.prisma.instituteInvitation.count({
        where,
      }),
    ]);

    return {
      data: invitations,

      pagination: {
        page,
        limit,
        total,

        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async revoke(
    tenantId: string,
    invitationId: string,
    auditContext: AuditContext,
  ) {
    const invitation = await this.prisma.instituteInvitation.findFirst({
      where: {
        id: invitationId,

        tenantId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictException('Only pending invitations can be revoked');
    }

    const revokedInvitation = await this.prisma.instituteInvitation.update({
      where: {
        id: invitation.id,
      },

      data: {
        status: InvitationStatus.REVOKED,

        revokedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      tenantId,

      actorUserId: auditContext.actorUserId,

      ipAddress: auditContext.ipAddress,

      userAgent: auditContext.userAgent,

      action: AuditAction.INSTITUTE_INVITATION_REVOKED,

      targetType: 'InstituteInvitation',

      targetId: invitation.id,

      metadata: {
        email: invitation.email,

        role: invitation.role,
      },
    });

    return {
      message: 'Invitation revoked successfully',

      invitation: {
        id: revokedInvitation.id,

        email: revokedInvitation.email,

        status: revokedInvitation.status,

        revokedAt: revokedInvitation.revokedAt,

        emailStatus: revokedInvitation.emailStatus,
      },
    };
  }

  async resend(
    tenantId: string,
    invitationId: string,
    auditContext: AuditContext,
  ) {
    const invitation = await this.prisma.instituteInvitation.findFirst({
      where: {
        id: invitationId,

        tenantId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ConflictException('Accepted invitations cannot be resent');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },

      select: {
        name: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Institute not found');
    }

    const rawToken = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();

    expiresAt.setHours(expiresAt.getHours() + 24);

    const updatedInvitation = await this.prisma.instituteInvitation.update({
      where: {
        id: invitation.id,
      },

      data: {
        tokenHash,

        status: InvitationStatus.PENDING,

        expiresAt,

        acceptedAt: null,

        revokedAt: null,

        emailStatus: InvitationEmailStatus.PENDING,

        emailSentAt: null,

        emailError: null,
      },
    });

    await this.auditLogsService.create({
      tenantId,

      actorUserId: auditContext.actorUserId,

      ipAddress: auditContext.ipAddress,

      userAgent: auditContext.userAgent,

      action: AuditAction.INSTITUTE_INVITATION_RESENT,

      targetType: 'InstituteInvitation',

      targetId: updatedInvitation.id,

      metadata: {
        email: updatedInvitation.email,

        role: updatedInvitation.role,

        expiresAt: expiresAt.toISOString(),
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    const invitationUrl = `${frontendUrl}/accept-invitation?token=${rawToken}`;

    try {
      await this.mailService.sendInstituteInvitation({
        to: updatedInvitation.email,

        firstName: updatedInvitation.firstName,

        instituteName: tenant.name,

        role: updatedInvitation.role,

        invitationUrl,

        expiresAt: updatedInvitation.expiresAt,
      });

      const sentInvitation = await this.prisma.instituteInvitation.update({
        where: {
          id: updatedInvitation.id,
        },

        data: {
          emailStatus: InvitationEmailStatus.SENT,

          emailSentAt: new Date(),

          emailError: null,
        },
      });

      await this.auditLogsService.create({
        tenantId,

        actorUserId: auditContext.actorUserId,

        ipAddress: auditContext.ipAddress,

        userAgent: auditContext.userAgent,

        action: AuditAction.INSTITUTE_INVITATION_EMAIL_SENT,

        targetType: 'InstituteInvitation',

        targetId: sentInvitation.id,

        metadata: {
          email: sentInvitation.email,

          role: sentInvitation.role,

          emailStatus: sentInvitation.emailStatus,

          emailSentAt: sentInvitation.emailSentAt?.toISOString() ?? null,

          source: 'RESEND',
        },
      });

      return {
        message: 'Invitation resent and email sent successfully',

        invitation: {
          id: sentInvitation.id,

          email: sentInvitation.email,

          firstName: sentInvitation.firstName,

          lastName: sentInvitation.lastName,

          role: sentInvitation.role,

          status: sentInvitation.status,

          expiresAt: sentInvitation.expiresAt,

          emailStatus: sentInvitation.emailStatus,

          emailSentAt: sentInvitation.emailSentAt,

          emailError: sentInvitation.emailError,
        },

        // DEVELOPMENT ONLY
        invitationUrl,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown email delivery error';

      const failedInvitation = await this.prisma.instituteInvitation.update({
        where: {
          id: updatedInvitation.id,
        },

        data: {
          emailStatus: InvitationEmailStatus.FAILED,

          emailSentAt: null,

          emailError: errorMessage,
        },
      });

      await this.auditLogsService.create({
        tenantId,

        actorUserId: auditContext.actorUserId,

        ipAddress: auditContext.ipAddress,

        userAgent: auditContext.userAgent,

        action: AuditAction.INSTITUTE_INVITATION_EMAIL_FAILED,

        targetType: 'InstituteInvitation',

        targetId: failedInvitation.id,

        metadata: {
          email: failedInvitation.email,

          role: failedInvitation.role,

          emailStatus: failedInvitation.emailStatus,

          error: errorMessage,

          source: 'RESEND',
        },
      });

      return {
        message: 'Invitation regenerated, but email delivery failed',

        invitation: {
          id: failedInvitation.id,

          email: failedInvitation.email,

          firstName: failedInvitation.firstName,

          lastName: failedInvitation.lastName,

          role: failedInvitation.role,

          status: failedInvitation.status,

          expiresAt: failedInvitation.expiresAt,

          emailStatus: failedInvitation.emailStatus,

          emailSentAt: failedInvitation.emailSentAt,

          emailError: failedInvitation.emailError,
        },

        // DEVELOPMENT ONLY
        invitationUrl,
      };
    }
  }
}
