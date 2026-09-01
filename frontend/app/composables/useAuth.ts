import type { AuthTenant, AuthUser } from "~/types/auth";
import { useAuthService } from "~/services/auth.service.ts";

export function useAuth() {
  const accessToken = useState<string | null>("auth-access-token", () => null);

  const user = useState<AuthUser | null>("auth-user", () => null);

  const tenant = useState<AuthTenant | null>("auth-tenant", () => null);

  const role = useState<string | null>("auth-role", () => null);

  const initialized = useState<boolean>("auth-initialized", () => false);

  const initializing = useState<boolean>("auth-initializing", () => false);

  const isAuthenticated = computed(() => {
    return !!accessToken.value && !!user.value;
  });

  function setAuth(data: {
    accessToken: string;
    user: AuthUser;
    tenant: AuthTenant;
    role: string;
  }) {
    accessToken.value = data.accessToken;

    user.value = data.user;

    tenant.value = data.tenant;

    role.value = data.role;
  }

  function clearAuth() {
    accessToken.value = null;
    user.value = null;
    tenant.value = null;
    role.value = null;
  }

  async function restoreSession() {
    /*
     * Don't perform the same restoration
     * repeatedly during navigation.
     */
    if (initialized.value || initializing.value) {
      return;
    }

    initializing.value = true;

    try {
      const authService = useAuthService();

      /*
       * Browser automatically sends the
       * HTTP-only refresh cookie.
       */
      const refreshResponse = await authService.refresh();

      accessToken.value = refreshResponse.accessToken;

      /*
       * Now retrieve the authenticated
       * user's current information.
       */
      const meResponse = await authService.me(refreshResponse.accessToken);

      user.value = meResponse.user;

      tenant.value = meResponse.tenant;

      role.value = meResponse.role;
    } catch {
      clearAuth();
    } finally {
      initialized.value = true;
      initializing.value = false;
    }
  }

  async function logout() {
    const authService = useAuthService();

    try {
      await authService.logout(accessToken.value);
    } finally {
      clearAuth();

      initialized.value = true;

      await navigateTo("/login");
    }
  }

  return {
    accessToken,
    user,
    tenant,
    role,

    initialized,
    initializing,

    isAuthenticated,

    setAuth,
    clearAuth,
    restoreSession,
    logout,
  };
}
