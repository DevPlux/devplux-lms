import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { InstituteUsersController } from './institute-users.controller';
import { InstituteUsersService } from './institute-users.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuthModule, AuditLogsModule],
  controllers: [InstituteUsersController],
  providers: [InstituteUsersService],
})
export class InstituteUsersModule {}
