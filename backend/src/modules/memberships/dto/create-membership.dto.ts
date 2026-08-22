import { IsEnum, IsUUID } from 'class-validator';

import { InstituteRole } from '../../../generated/prisma/enums';

export class CreateMembershipDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  tenantId: string;

  @IsEnum(InstituteRole)
  role: InstituteRole;
}
