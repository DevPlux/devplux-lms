<script lang="ts" setup>
definePageMeta({
  middleware: "auth",
  layout: "dashboard",
});

const { user, tenant, role } = useAuth();
</script>

<template>
  <div>
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Dashboard</h1>

      <p class="mt-2 text-slate-500">
        Welcome back,
        {{ user?.firstName }}.
      </p>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">Institute</p>

        <p class="mt-2 text-lg font-semibold text-slate-900">
          {{ tenant?.name }}
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">Your Role</p>

        <p class="mt-2 text-lg font-semibold text-slate-900">
          {{ role }}
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">Users</p>

        <p class="mt-2 text-2xl font-bold text-slate-900">—</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">Pending Invitations</p>

        <p class="mt-2 text-2xl font-bold text-slate-900">—</p>
      </div>
    </div>
  </div>
</template>
