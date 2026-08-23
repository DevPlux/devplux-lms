import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { InstituteRole } from '../../generated/prisma/enums';

@Injectable()
export class InstituteUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.membership.findMany({
      where: {
        tenantId,
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

      orderBy: {
        createdAt: 'desc',
      },
    });
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

  async updateRole(tenantId: string, userId: string, role: InstituteRole) {
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

    return this.prisma.membership.update({
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
  }
}
