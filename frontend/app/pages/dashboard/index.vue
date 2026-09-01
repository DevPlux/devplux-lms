<script lang="ts" setup>
definePageMeta({
  middleware: "auth",
});

const { user, tenant, role, initialized, initializing, logout } = useAuth();
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <!-- AUTH RESTORATION LOADING -->
    <div
      v-if="!initialized || initializing"
      class="flex min-h-screen items-center justify-center"
    >
      <div class="text-center">
        <div
          class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"
        />

        <p class="mt-4 text-sm text-slate-500">Loading your workspace...</p>
      </div>
    </div>

    <!-- DASHBOARD -->
    <div v-else class="p-8">
      <div class="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-slate-900">Dashboard</h1>

          <button
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            @click="logout"
          >
            Logout
          </button>
        </div>

        <div class="mt-6 space-y-2 text-slate-700">
          <p>
            User:
            <strong>
              {{ user?.firstName }}
              {{ user?.lastName }}
            </strong>
          </p>

          <p>
            Institute:
            <strong>
              {{ tenant?.name }}
            </strong>
          </p>

          <p>
            Role:
            <strong>
              {{ role }}
            </strong>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
