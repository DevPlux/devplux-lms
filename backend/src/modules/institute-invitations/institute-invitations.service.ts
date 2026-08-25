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
  InvitationStatus,
  MembershipStatus,
} from '../../generated/prisma/enums';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/enums/audit-action.enum';
import type { AuditContext } from '../audit-logs/types/audit-context.type';

import { CreateInstituteInvitationDto } from './dto/create-institute-invitation.dto';
import { AcceptInstituteInvitationDto } from './dto/accept-institute-invitation.dto';

@Injectable()
export class InstituteInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
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

    return {
      message: 'Invitation created successfully',

      invitation: {
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },

      /*
       * Development only.
       * Later this URL will be sent by email
       * and removed from the API response.
       */
      invitationUrl,
    };
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
}
