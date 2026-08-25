import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { InstituteInvitationsController } from './institute-invitations.controller';
import { InstituteInvitationsService } from './institute-invitations.service';

@Module({
  imports: [AuthModule, AuditLogsModule],
  controllers: [InstituteInvitationsController],
  providers: [InstituteInvitationsService],
})
export class InstituteInvitationsModule {}
