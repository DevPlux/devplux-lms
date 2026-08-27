import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

@Module({
  imports: [forwardRef(() => AuthModule)],

  controllers: [AuditLogsController],

  providers: [AuditLogsService],

  exports: [AuditLogsService],
})
export class AuditLogsModule {}
