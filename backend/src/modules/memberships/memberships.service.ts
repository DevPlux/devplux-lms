import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateMembershipDto } from './dto/create-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMembershipDto: CreateMembershipDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: createMembershipDto.userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: createMembershipDto.tenantId,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: createMembershipDto.userId,
          tenantId: createMembershipDto.tenantId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'User already has a membership in this tenant',
      );
    }

    return this.prisma.membership.create({
      data: {
        userId: createMembershipDto.userId,
        tenantId: createMembershipDto.tenantId,
        role: createMembershipDto.role,
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
        tenant: true,
      },
    });
  }
}
