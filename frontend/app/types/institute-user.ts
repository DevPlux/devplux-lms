export type InstituteUserRole =
  | "INSTITUTE_ADMIN"
  | "ACADEMIC_MANAGER"
  | "TEACHER"
  | "STUDENT"
  | "PARENT"
  | "ACCOUNTANT";

export type MembershipStatus = "ACTIVE" | "INACTIVE";

export interface InstituteUserAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstituteUser {
  id: string;
  userId: string;
  tenantId: string;
  role: InstituteUserRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  user: InstituteUserAccount;
}

export interface InstituteUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: InstituteUserRole;
  status?: MembershipStatus;
}

export interface InstituteUsersResponse {
  data: InstituteUser[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InstituteUserSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface InstituteUserActionResponse {
  message: string;
}

export interface RevokeAllSessionsResponse {
  message: string;
  revokedSessions: number;
}
