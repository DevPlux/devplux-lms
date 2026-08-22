import { InstituteRole } from '../../../generated/prisma/enums';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: InstituteRole;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  message: string;

  accessToken: string;
  refreshToken: string;

  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  tenant: {
    id: string;
    name: string;
    slug: string;
  };

  role: InstituteRole;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutResult {
  message: string;
}
