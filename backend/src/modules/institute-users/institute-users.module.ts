import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { InstituteUsersController } from './institute-users.controller';
import { InstituteUsersService } from './institute-users.service';

@Module({
  imports: [AuthModule],
  controllers: [InstituteUsersController],
  providers: [InstituteUsersService],
})
export class InstituteUsersModule {}
