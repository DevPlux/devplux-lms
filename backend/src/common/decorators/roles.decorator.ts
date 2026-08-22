import { SetMetadata } from '@nestjs/common';

import { InstituteRole } from '../../generated/prisma/enums';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: InstituteRole[]) =>
  SetMetadata(ROLES_KEY, roles);
