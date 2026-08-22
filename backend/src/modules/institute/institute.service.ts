import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { UpdateInstituteProfileDto } from './dto/update-institute-profile.dto';

@Injectable()
export class InstituteService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
      include: {
        profile: true,
      },
    });

    return tenant;
  }

  async updateProfile(
    tenantId: string,
    updateInstituteProfileDto: UpdateInstituteProfileDto,
  ) {
    return this.prisma.tenantProfile.upsert({
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
  }
}
