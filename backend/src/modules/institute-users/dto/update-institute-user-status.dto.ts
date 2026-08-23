import { IsEnum } from 'class-validator';

import { MembershipStatus } from '../../../generated/prisma/enums';

export class UpdateInstituteUserStatusDto {
  @IsEnum(MembershipStatus)
  status: MembershipStatus;
}
