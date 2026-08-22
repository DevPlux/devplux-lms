import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateTenantDomainDto } from './dto/create-tenant-domain.dto';

@Injectable()
export class TenantDomainsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDomainDto: CreateTenantDomainDto) {
    const hostname = createTenantDomainDto.hostname.toLowerCase().trim();

    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: createTenantDomainDto.tenantId,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existingDomain = await this.prisma.tenantDomain.findUnique({
      where: {
        hostname,
      },
    });

    if (existingDomain) {
      throw new ConflictException('Hostname already exists');
    }

    if (createTenantDomainDto.isPrimary) {
      await this.prisma.tenantDomain.updateMany({
        where: {
          tenantId: createTenantDomainDto.tenantId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.tenantDomain.create({
      data: {
        tenantId: createTenantDomainDto.tenantId,
        hostname,
        isPrimary: createTenantDomainDto.isPrimary ?? false,
      },
    });
  }

  async findByTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.prisma.tenantDomain.findMany({
      where: {
        tenantId,
      },
      orderBy: [
        {
          isPrimary: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async findByHostname(hostname: string) {
    const normalizedHostname = hostname.toLowerCase().trim();

    const domain = await this.prisma.tenantDomain.findUnique({
      where: {
        hostname: normalizedHostname,
      },
      include: {
        tenant: true,
      },
    });

    if (!domain) {
      throw new NotFoundException('Tenant domain not found');
    }

    return domain;
  }
}
