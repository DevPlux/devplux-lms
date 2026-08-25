import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { InstituteController } from './institute.controller';
import { InstituteService } from './institute.service';

@Module({
  imports: [AuthModule, AuditLogsModule],
  controllers: [InstituteController],
  providers: [InstituteService],
})
export class InstituteModule {}
