import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { PrismaService } from '../../database/prisma/prisma.service';

export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    const hostHeader = req.headers.host;

    if (!hostHeader) {
      throw new NotFoundException('Host header not found');
    }

    const hostname = hostHeader.split(':')[0].toLowerCase();

    const domain = await this.prisma.tenantDomain.findUnique({
      where: {
        hostname,
      },
      include: {
        tenant: true,
      },
    });

    if (!domain) {
      throw new NotFoundException('Tenant not found for this hostname');
    }

    req.tenant = {
      id: domain.tenant.id,
      name: domain.tenant.name,
      slug: domain.tenant.slug,
      status: domain.tenant.status,
    };

    next();
  }
}
