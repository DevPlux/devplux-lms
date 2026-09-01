<script lang="ts" setup>
const { user, tenant, role, initialized, initializing, logout } = useAuth();

const sidebarOpen = ref(false);

const navigation = [
  {
    label: "Dashboard",
    to: "/dashboard",
  },
  {
    label: "Institute Users",
    to: "/dashboard/users",
  },
  {
    label: "Invitations",
    to: "/dashboard/invitations",
  },
  {
    label: "Audit Logs",
    to: "/dashboard/audit-logs",
  },
  {
    label: "Institute Profile",
    to: "/dashboard/institute-profile",
  },
];
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <!-- GLOBAL AUTH LOADING -->
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

    <!-- AUTHENTICATED APP -->
    <div v-else class="flex min-h-screen">
      <!-- DESKTOP SIDEBAR -->
      <aside
        class="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col"
      >
        <div class="border-b border-slate-800 px-6 py-6">
          <h1 class="text-xl font-bold text-white">DevPlux LMS</h1>

          <p class="mt-1 truncate text-sm text-slate-400">
            {{ tenant?.name }}
          </p>
        </div>

        <nav class="flex-1 space-y-1 p-4">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            active-class="bg-blue-600 text-white hover:bg-blue-600"
            class="block rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="border-t border-slate-800 p-4">
          <div class="px-2">
            <p class="truncate text-sm font-medium text-white">
              {{ user?.firstName }}
              {{ user?.lastName }}
            </p>

            <p class="mt-1 truncate text-xs text-slate-400">
              {{ user?.email }}
            </p>

            <p class="mt-1 text-xs text-slate-500">
              {{ role }}
            </p>
          </div>

          <button
            class="mt-4 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            @click="logout"
          >
            Logout
          </button>
        </div>
      </aside>

      <!-- MOBILE SIDEBAR -->
      <div v-if="sidebarOpen" class="fixed inset-0 z-40 lg:hidden">
        <div
          class="absolute inset-0 bg-black/50"
          @click="sidebarOpen = false"
        />

        <aside class="relative z-50 flex h-full w-72 flex-col bg-slate-950">
          <div
            class="flex items-center justify-between border-b border-slate-800 px-6 py-5"
          >
            <div>
              <h1 class="text-lg font-bold text-white">DevPlux LMS</h1>

              <p class="mt-1 text-xs text-slate-400">
                {{ tenant?.name }}
              </p>
            </div>

            <button
              class="text-slate-400 hover:text-white"
              @click="sidebarOpen = false"
            >
              ✕
            </button>
          </div>

          <nav class="flex-1 space-y-1 p-4">
            <NuxtLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              active-class="bg-blue-600 text-white"
              class="block rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              @click="sidebarOpen = false"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>

          <div class="border-t border-slate-800 p-4">
            <p class="text-sm font-medium text-white">
              {{ user?.firstName }}
              {{ user?.lastName }}
            </p>

            <p class="mt-1 text-xs text-slate-400">
              {{ user?.email }}
            </p>

            <button
              class="mt-4 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
              @click="logout"
            >
              Logout
            </button>
          </div>
        </aside>
      </div>

      <!-- MAIN AREA -->
      <div class="min-w-0 flex-1">
        <!-- TOP BAR -->
        <header
          class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8"
        >
          <div class="flex items-center gap-3">
            <button
              class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              @click="sidebarOpen = true"
            >
              ☰
            </button>

            <div>
              <p class="text-sm font-semibold text-slate-900">
                {{ tenant?.name }}
              </p>

              <p class="text-xs text-slate-500">
                {{ role }}
              </p>
            </div>
          </div>

          <div class="text-right">
            <p class="text-sm font-medium text-slate-900">
              {{ user?.firstName }}
              {{ user?.lastName }}
            </p>

            <p class="text-xs text-slate-500">
              {{ user?.email }}
            </p>
          </div>
        </header>

        <!-- PAGE CONTENT -->
        <main class="p-4 lg:p-8">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
