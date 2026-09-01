export default defineNuxtRouteMiddleware(async () => {
  /*
   * Authentication restoration depends on the
   * browser's HTTP-only refresh cookie.
   *
   * Do not execute this check during Nuxt SSR.
   */
  if (import.meta.server) {
    return;
  }

  const { isAuthenticated, initialized, restoreSession } = useAuth();

  if (!initialized.value) {
    await restoreSession();
  }

  if (!isAuthenticated.value) {
    return navigateTo("/login");
  }
});
