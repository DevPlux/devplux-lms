import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';

import type { NextFunction, Request, Response } from 'express';

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
    /*
     * DEVELOPMENT SUPPORT
     *
     * Browser cannot manually change the real Host header,
     * so the Nuxt frontend sends:
     *
     * X-Tenant-Host: abc-academy.devplux.com
     *
     * In production we should normally rely on
     * the actual hostname instead.
     */
    const tenantHostHeader = req.headers['x-tenant-host'];

    let hostname: string;

    if (typeof tenantHostHeader === 'string' && tenantHostHeader.trim()) {
      hostname = tenantHostHeader.trim().toLowerCase().split(':')[0];
    } else {
      const hostHeader = req.headers.host;

      if (!hostHeader) {
        throw new NotFoundException('Host header not found');
      }

      hostname = hostHeader.toLowerCase().split(':')[0];
    }

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
