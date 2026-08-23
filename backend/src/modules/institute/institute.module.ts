import { Module } from '@nestjs/common';

import { InstituteController } from './institute.controller';
import { InstituteService } from './institute.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [InstituteController],
  providers: [InstituteService],
})
export class InstituteModule {}
