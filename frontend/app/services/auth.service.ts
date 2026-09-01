import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RefreshResponse,
} from "~/types/auth";
import { useApiService } from "~/services/api.service.ts";

export function useAuthService() {
  const { api } = useApiService();

  async function login(payload: LoginRequest): Promise<LoginResponse> {
    return api<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
    });
  }

  async function refresh(): Promise<RefreshResponse> {
    return api<RefreshResponse>("/auth/refresh", {
      method: "POST",
    });
  }

  async function me(accessToken: string): Promise<MeResponse> {
    return api<MeResponse>("/auth/me", {
      method: "GET",

      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async function logout(accessToken?: string | null) {
    return api("/auth/logout", {
      method: "POST",

      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    });
  }

  return {
    login,
    refresh,
    me,
    logout,
  };
}
