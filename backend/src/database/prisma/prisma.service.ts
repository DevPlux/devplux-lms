import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor(configService: ConfigService) {
        const connectionString = configService.getOrThrow<string>('DATABASE_URL');

        const adapter = new PrismaPg({
            connectionString,
        });

        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
        console.log('PostgreSQL connected successfully');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}