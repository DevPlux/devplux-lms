export function useApiService() {
  const config = useRuntimeConfig();

  const apiBaseUrl = String(config.public.apiBaseUrl ?? "");

  const tenantHost = String(config.public.tenantHost ?? "");

  const api = $fetch.create({
    baseURL: apiBaseUrl,

    credentials: "include",

    onRequest({ options }) {
      const headers = new Headers(options.headers);

      headers.set("Content-Type", "application/json");

      if (tenantHost) {
        headers.set("X-Tenant-Host", tenantHost);
      }

      options.headers = headers;
    },
  });

  return {
    api,
  };
}
