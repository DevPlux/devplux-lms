export default defineNuxtConfig({
  compatibilityDate: "2026-08-27",

  devtools: {
    enabled: true,
  },

  modules: ["@nuxtjs/tailwindcss"],

  runtimeConfig: {
    public: {
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1",

      tenantHost: process.env.NUXT_PUBLIC_TENANT_HOST ?? "",
    },
  },
});
