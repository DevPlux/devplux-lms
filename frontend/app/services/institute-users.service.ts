import type {
  InstituteUser,
  InstituteUserActionResponse,
  InstituteUserRole,
  InstituteUserSession,
  InstituteUsersQuery,
  InstituteUsersResponse,
  MembershipStatus,
  RevokeAllSessionsResponse,
} from "~/types/institute-user";
import { useApiService } from "~/services/api.service.ts";

export function useInstituteUsersService() {
  const { api } = useApiService();
  const { accessToken } = useAuth();

  function getAuthHeaders() {
    if (!accessToken.value) {
      throw new Error("Authentication token is not available");
    }

    return {
      Authorization: `Bearer ${accessToken.value}`,
    };
  }

  async function findAll(
    query: InstituteUsersQuery = {},
  ): Promise<InstituteUsersResponse> {
    return api<InstituteUsersResponse>("/institute-users", {
      method: "GET",

      headers: getAuthHeaders(),

      query: {
        page: query.page,
        limit: query.limit,

        search: query.search || undefined,

        role: query.role || undefined,

        status: query.status || undefined,
      },
    });
  }

  async function findOne(userId: string): Promise<InstituteUser> {
    return api<InstituteUser>(`/institute-users/${userId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  }

  async function updateRole(
    userId: string,
    role: InstituteUserRole,
  ): Promise<InstituteUser> {
    return api<InstituteUser>(`/institute-users/${userId}/role`, {
      method: "PATCH",

      headers: getAuthHeaders(),

      body: {
        role,
      },
    });
  }

  async function updateStatus(
    userId: string,
    status: MembershipStatus,
  ): Promise<InstituteUser> {
    return api<InstituteUser>(`/institute-users/${userId}/status`, {
      method: "PATCH",

      headers: getAuthHeaders(),

      body: {
        status,
      },
    });
  }

  async function removeFromInstitute(
    userId: string,
  ): Promise<InstituteUserActionResponse> {
    return api<InstituteUserActionResponse>(`/institute-users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  }

  async function findSessions(userId: string): Promise<InstituteUserSession[]> {
    return api<InstituteUserSession[]>(`/institute-users/${userId}/sessions`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  }

  async function revokeSession(
    userId: string,
    sessionId: string,
  ): Promise<InstituteUserActionResponse> {
    return api<InstituteUserActionResponse>(
      `/institute-users/${userId}/sessions/${sessionId}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
    );
  }

  async function revokeAllSessions(
    userId: string,
  ): Promise<RevokeAllSessionsResponse> {
    return api<RevokeAllSessionsResponse>(
      `/institute-users/${userId}/sessions`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
    );
  }

  return {
    findAll,
    findOne,

    updateRole,
    updateStatus,

    removeFromInstitute,

    findSessions,
    revokeSession,
    revokeAllSessions,
  };
}
