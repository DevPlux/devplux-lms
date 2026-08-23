import { IsEnum } from 'class-validator';

import { InstituteRole } from '../../../generated/prisma/enums';

export class UpdateInstituteUserRoleDto {
  @IsEnum(InstituteRole)
  role: InstituteRole;
}
