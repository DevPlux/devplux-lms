<script lang="ts" setup>
import { useAuthService } from "~/services/auth.service.ts";

definePageMeta({
  layout: "auth",
});

const authService = useAuthService();
const { setAuth, initialized } = useAuth();

const email = ref("");
const password = ref("");

const loading = ref(false);
const errorMessage = ref("");

async function handleLogin() {
  errorMessage.value = "";

  if (!email.value || !password.value) {
    errorMessage.value = "Please enter your email and password.";
    return;
  }

  loading.value = true;

  try {
    const response = await authService.login({
      email: email.value,
      password: password.value,
    });

    setAuth({
      accessToken: response.accessToken,
      user: response.user,
      tenant: response.tenant,
      role: response.role,
    });

    initialized.value = true;

    await navigateTo("/dashboard");
  } catch (error: any) {
    errorMessage.value =
      error?.data?.message ?? "Login failed. Please check your credentials.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-950 px-4">
    <div
      class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl"
    >
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-white">DevPlux LMS</h1>

        <p class="mt-2 text-sm text-slate-400">
          Sign in to your institute workspace
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="handleLogin">
        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-300"
            for="email"
          >
            Email
          </label>

          <input
            id="email"
            v-model="email"
            autocomplete="email"
            class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            placeholder="admin@example.com"
            type="email"
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-300"
            for="password"
          >
            Password
          </label>

          <input
            id="password"
            v-model="password"
            autocomplete="current-password"
            class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            placeholder="Enter your password"
            type="password"
          />
        </div>

        <div
          v-if="errorMessage"
          class="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300"
        >
          {{ errorMessage }}
        </div>

        <button
          :disabled="loading"
          class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
        >
          {{ loading ? "Signing in..." : "Sign In" }}
        </button>
      </form>
    </div>
  </div>
</template>
