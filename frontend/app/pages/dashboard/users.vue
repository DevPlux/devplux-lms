<script lang="ts" setup>
import type {
  InstituteUser,
  InstituteUserRole,
  InstituteUserSession,
  MembershipStatus,
} from "~/types/institute-user";

import { useInstituteUsersService } from "~/services/institute-users.service";

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
});

const toast = useToast();

/*
|--------------------------------------------------------------------------
| Users
|--------------------------------------------------------------------------
*/

const users = ref<InstituteUser[]>([]);

const loading = ref(false);
const errorMessage = ref("");

/*
|--------------------------------------------------------------------------
| Filters
|--------------------------------------------------------------------------
*/

const search = ref("");

const selectedRole = ref<InstituteUserRole | "">("");

const selectedStatus = ref<MembershipStatus | "">("");

const roleOptions: {
  label: string;
  value: InstituteUserRole;
}[] = [
  {
    label: "Institute Admin",
    value: "INSTITUTE_ADMIN",
  },
  {
    label: "Academic Manager",
    value: "ACADEMIC_MANAGER",
  },
  {
    label: "Teacher",
    value: "TEACHER",
  },
  {
    label: "Student",
    value: "STUDENT",
  },
  {
    label: "Parent",
    value: "PARENT",
  },
  {
    label: "Accountant",
    value: "ACCOUNTANT",
  },
];

const statusOptions: {
  label: string;
  value: MembershipStatus;
}[] = [
  {
    label: "Active",
    value: "ACTIVE",
  },
  {
    label: "Inactive",
    value: "INACTIVE",
  },
];

const hasActiveFilters = computed(() => {
  return (
    search.value.trim().length > 0 ||
    selectedRole.value !== "" ||
    selectedStatus.value !== ""
  );
});

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

const page = ref(1);
const limit = ref(10);

const total = ref(0);
const totalPages = ref(1);

/*
|--------------------------------------------------------------------------
| Search Debounce
|--------------------------------------------------------------------------
*/

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

/*
|--------------------------------------------------------------------------
| Manage User
|--------------------------------------------------------------------------
*/

const manageOpen = ref(false);

const selectedUser = ref<InstituteUser | null>(null);

const editRole = ref<InstituteUserRole | "">("");

const editStatus = ref<MembershipStatus | "">("");

const savingRole = ref(false);
const savingStatus = ref(false);

/*
|--------------------------------------------------------------------------
| Sessions
|--------------------------------------------------------------------------
*/

const sessions = ref<InstituteUserSession[]>([]);

const loadingSessions = ref(false);

const revokingSessionId = ref<string | null>(null);

const revokingAllSessions = ref(false);

/*
|--------------------------------------------------------------------------
| Remove User
|--------------------------------------------------------------------------
*/

const showRemoveConfirmation = ref(false);

const removingUser = ref(false);

/*
|--------------------------------------------------------------------------
| Load Users
|--------------------------------------------------------------------------
*/

async function loadUsers() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const instituteUsersService = useInstituteUsersService();

    const response = await instituteUsersService.findAll({
      page: page.value,
      limit: limit.value,

      search: search.value.trim() || undefined,

      role: selectedRole.value || undefined,

      status: selectedStatus.value || undefined,
    });

    users.value = Array.isArray(response.data) ? response.data : [];

    page.value = Number(response.pagination?.page ?? 1);

    limit.value = Number(response.pagination?.limit ?? 10);

    total.value = Number(response.pagination?.total ?? 0);

    totalPages.value = Math.max(
      1,
      Number(response.pagination?.totalPages ?? 1),
    );
  } catch (error) {
    console.error("Failed to load institute users:", error);

    users.value = [];
    total.value = 0;
    totalPages.value = 1;

    errorMessage.value = "Failed to load institute users.";
  } finally {
    loading.value = false;
  }
}

/*
|--------------------------------------------------------------------------
| Live Search
|--------------------------------------------------------------------------
*/

watch(search, () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  searchTimeout = setTimeout(async () => {
    page.value = 1;
    await loadUsers();
  }, 300);
});

/*
|--------------------------------------------------------------------------
| Live Filters
|--------------------------------------------------------------------------
*/

watch([selectedRole, selectedStatus], async () => {
  page.value = 1;
  await loadUsers();
});

async function resetFilters() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }

  search.value = "";
  selectedRole.value = "";
  selectedStatus.value = "";

  page.value = 1;

  await loadUsers();
}

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

async function previousPage() {
  if (loading.value || page.value <= 1) {
    return;
  }

  page.value--;

  await loadUsers();
}

async function nextPage() {
  if (loading.value || page.value >= totalPages.value) {
    return;
  }

  page.value++;

  await loadUsers();
}

/*
|--------------------------------------------------------------------------
| Manage User
|--------------------------------------------------------------------------
*/

async function openManageUser(membership: InstituteUser) {
  selectedUser.value = membership;

  editRole.value = membership.role;

  editStatus.value = membership.status;

  showRemoveConfirmation.value = false;

  sessions.value = [];

  manageOpen.value = true;

  await loadSessions();
}

function closeManageUser() {
  if (
    savingRole.value ||
    savingStatus.value ||
    removingUser.value ||
    revokingAllSessions.value ||
    revokingSessionId.value
  ) {
    return;
  }

  manageOpen.value = false;

  selectedUser.value = null;

  editRole.value = "";
  editStatus.value = "";

  sessions.value = [];

  showRemoveConfirmation.value = false;
}

/*
|--------------------------------------------------------------------------
| Role
|--------------------------------------------------------------------------
*/

async function saveRole() {
  if (!selectedUser.value || !editRole.value) {
    return;
  }

  if (editRole.value === selectedUser.value.role) {
    toast.info("The user already has this role.");

    return;
  }

  savingRole.value = true;

  try {
    const instituteUsersService = useInstituteUsersService();

    const updated = await instituteUsersService.updateRole(
      selectedUser.value.userId,
      editRole.value,
    );

    selectedUser.value = updated;

    editRole.value = updated.role;

    toast.success("User role updated successfully.");

    await loadUsers();
  } catch (error: any) {
    console.error("Failed to update role:", error);

    toast.error(error?.data?.message || "Failed to update user role.");

    if (selectedUser.value) {
      editRole.value = selectedUser.value.role;
    }
  } finally {
    savingRole.value = false;
  }
}

/*
|--------------------------------------------------------------------------
| Membership Status
|--------------------------------------------------------------------------
*/

async function saveStatus() {
  if (!selectedUser.value || !editStatus.value) {
    return;
  }

  if (editStatus.value === selectedUser.value.status) {
    toast.info("Membership status is already set to this value.");

    return;
  }

  savingStatus.value = true;

  try {
    const instituteUsersService = useInstituteUsersService();

    const updated = await instituteUsersService.updateStatus(
      selectedUser.value.userId,
      editStatus.value,
    );

    selectedUser.value = updated;

    editStatus.value = updated.status;

    toast.success("Membership status updated successfully.");

    await loadUsers();
  } catch (error: any) {
    console.error("Failed to update membership status:", error);

    toast.error(error?.data?.message || "Failed to update membership status.");

    if (selectedUser.value) {
      editStatus.value = selectedUser.value.status;
    }
  } finally {
    savingStatus.value = false;
  }
}

/*
|--------------------------------------------------------------------------
| Sessions
|--------------------------------------------------------------------------
*/

async function loadSessions() {
  if (!selectedUser.value) {
    return;
  }

  loadingSessions.value = true;

  try {
    const instituteUsersService = useInstituteUsersService();

    const response = await instituteUsersService.findSessions(
      selectedUser.value.userId,
    );

    sessions.value = Array.isArray(response) ? response : [];
  } catch (error: any) {
    console.error("Failed to load sessions:", error);

    sessions.value = [];

    toast.error(error?.data?.message || "Failed to load user sessions.");
  } finally {
    loadingSessions.value = false;
  }
}

function isSessionExpired(session: InstituteUserSession) {
  return new Date(session.expiresAt).getTime() < Date.now();
}

function isSessionActive(session: InstituteUserSession) {
  return !session.revokedAt && !isSessionExpired(session);
}

function sessionStatus(session: InstituteUserSession) {
  if (session.revokedAt) {
    return "REVOKED";
  }

  if (isSessionExpired(session)) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown device";
  }

  if (userAgent.includes("Chrome")) {
    return "Chrome Browser";
  }

  if (userAgent.includes("Firefox")) {
    return "Firefox Browser";
  }

  if (userAgent.includes("Safari")) {
    return "Safari Browser";
  }

  if (userAgent.includes("Edge") || userAgent.includes("Edg/")) {
    return "Microsoft Edge";
  }

  return userAgent.length > 55 ? `${userAgent.slice(0, 55)}...` : userAgent;
}

/*
|--------------------------------------------------------------------------
| Revoke One Session
|--------------------------------------------------------------------------
*/

async function revokeSession(session: InstituteUserSession) {
  if (!selectedUser.value || !isSessionActive(session)) {
    return;
  }

  revokingSessionId.value = session.id;

  try {
    const instituteUsersService = useInstituteUsersService();

    const response = await instituteUsersService.revokeSession(
      selectedUser.value.userId,
      session.id,
    );

    toast.success(response.message || "Session revoked successfully.");

    await loadSessions();
  } catch (error: any) {
    console.error("Failed to revoke session:", error);

    toast.error(error?.data?.message || "Failed to revoke session.");
  } finally {
    revokingSessionId.value = null;
  }
}

/*
|--------------------------------------------------------------------------
| Revoke All Sessions
|--------------------------------------------------------------------------
*/

async function revokeAllSessions() {
  if (!selectedUser.value) {
    return;
  }

  const activeSessions = sessions.value.filter(isSessionActive);

  if (activeSessions.length === 0) {
    toast.info("This user has no active sessions.");

    return;
  }

  revokingAllSessions.value = true;

  try {
    const instituteUsersService = useInstituteUsersService();

    const response = await instituteUsersService.revokeAllSessions(
      selectedUser.value.userId,
    );

    if (response.revokedSessions === 0) {
      toast.info("No active sessions were found.");
    } else {
      toast.success(
        `${response.revokedSessions} session${
          response.revokedSessions === 1 ? "" : "s"
        } revoked successfully.`,
      );
    }

    await loadSessions();
  } catch (error: any) {
    console.error("Failed to revoke all sessions:", error);

    toast.error(error?.data?.message || "Failed to revoke all sessions.");
  } finally {
    revokingAllSessions.value = false;
  }
}

/*
|--------------------------------------------------------------------------
| Session Counts
|--------------------------------------------------------------------------
*/

const activeSessionCount = computed(() => {
  return sessions.value.filter(isSessionActive).length;
});

/*
|--------------------------------------------------------------------------
| Remove From Institute
|--------------------------------------------------------------------------
*/

function requestRemoveUser() {
  showRemoveConfirmation.value = true;
}

function cancelRemoveUser() {
  showRemoveConfirmation.value = false;
}

async function removeUser() {
  if (!selectedUser.value) {
    return;
  }

  removingUser.value = true;

  try {
    const instituteUsersService = useInstituteUsersService();

    const response = await instituteUsersService.removeFromInstitute(
      selectedUser.value.userId,
    );

    toast.success(
      response.message || "User removed from institute successfully.",
    );

    manageOpen.value = false;
    selectedUser.value = null;
    sessions.value = [];

    showRemoveConfirmation.value = false;

    /*
     * If the final user on a page was removed,
     * move back one page if possible.
     */
    if (users.value.length === 1 && page.value > 1) {
      page.value--;
    }

    await loadUsers();
  } catch (error: any) {
    console.error("Failed to remove user:", error);

    toast.error(
      error?.data?.message || "Failed to remove user from institute.",
    );
  } finally {
    removingUser.value = false;
  }
}

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

onMounted(async () => {
  await loadUsers();
});

onBeforeUnmount(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
});
</script>

<template>
  <div>
    <!-- PAGE HEADER -->
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Institute Users</h1>

        <p class="mt-2 text-sm text-slate-500">
          Manage the users who belong to your institute.
        </p>
      </div>

      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        type="button"
      >
        Add User
      </button>
    </div>

    <!-- FILTERS -->
    <div class="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="space-y-4">
        <!-- SEARCH -->
        <div>
          <label
            class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            for="user-search"
          >
            Search
          </label>

          <div class="relative">
            <input
              id="user-search"
              v-model="search"
              autocomplete="off"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Search by name or email..."
              type="text"
            />

            <div
              v-if="loading && search"
              class="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
              />
            </div>
          </div>
        </div>

        <!-- FILTERS -->
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <div>
            <label
              class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              for="role-filter"
            >
              Role
            </label>

            <select
              id="role-filter"
              v-model="selectedRole"
              :disabled="loading"
              class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All roles</option>

              <option
                v-for="option in roleOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div>
            <label
              class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              for="status-filter"
            >
              Membership Status
            </label>

            <select
              id="status-filter"
              v-model="selectedStatus"
              :disabled="loading"
              class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All statuses</option>

              <option
                v-for="option in statusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="flex items-end">
            <button
              v-if="hasActiveFilters"
              :disabled="loading"
              class="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 xl:w-auto"
              type="button"
              @click="resetFilters"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE ERROR -->
    <div
      v-if="errorMessage"
      class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <div class="flex items-center justify-between gap-4">
        <span>
          {{ errorMessage }}
        </span>

        <button
          class="font-semibold underline"
          type="button"
          @click="loadUsers"
        >
          Try again
        </button>
      </div>
    </div>

    <!-- USERS TABLE CARD -->
    <div
      class="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div
        v-if="loading && users.length === 0"
        class="flex min-h-64 items-center justify-center"
      >
        <div class="text-center">
          <div
            class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
          />

          <p class="mt-3 text-sm text-slate-500">Loading users...</p>
        </div>
      </div>

      <div
        v-else-if="users.length === 0"
        class="flex min-h-64 items-center justify-center px-6"
      >
        <div class="text-center">
          <p class="font-semibold text-slate-700">No users found</p>

          <p class="mt-1 text-sm text-slate-500">
            {{
              hasActiveFilters
                ? "No users match the current search or filters."
                : "No institute users are available."
            }}
          </p>
        </div>
      </div>

      <div v-else class="relative overflow-x-auto">
        <div
          v-if="loading"
          class="pointer-events-none absolute inset-0 z-10 bg-white/40"
        />

        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500"
              >
                User
              </th>

              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500"
              >
                Role
              </th>

              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500"
              >
                Membership
              </th>

              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500"
              >
                Account
              </th>

              <th
                class="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500"
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="membership in users"
              :key="membership.id"
              class="hover:bg-slate-50"
            >
              <td class="px-6 py-4">
                <p class="font-semibold text-slate-900">
                  {{ membership.user.firstName }}
                  {{ membership.user.lastName }}
                </p>

                <p class="mt-1 text-sm text-slate-500">
                  {{ membership.user.email }}
                </p>
              </td>

              <td class="px-6 py-4">
                <span
                  class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                  {{ membership.role }}
                </span>
              </td>

              <td class="px-6 py-4">
                <span
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold',

                    membership.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700',
                  ]"
                >
                  {{ membership.status }}
                </span>
              </td>

              <td class="px-6 py-4">
                <span
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold',

                    membership.user.isActive
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700',
                  ]"
                >
                  {{ membership.user.isActive ? "Active" : "Inactive" }}
                </span>
              </td>

              <td class="px-6 py-4 text-right">
                <button
                  class="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  type="button"
                  @click="openManageUser(membership)"
                >
                  Manage
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINATION -->
      <div
        v-if="users.length > 0"
        class="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-slate-500">
          Total users:
          <strong class="text-slate-700">
            {{ total }}
          </strong>
        </p>

        <div class="flex items-center gap-3">
          <button
            :disabled="loading || page <= 1"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
            type="button"
            @click="previousPage"
          >
            Previous
          </button>

          <span class="text-sm text-slate-600">
            Page
            <strong>{{ page }}</strong>
            of
            <strong>{{ totalPages }}</strong>
          </span>

          <button
            :disabled="loading || page >= totalPages"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
            type="button"
            @click="nextPage"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- MANAGE USER MODAL -->
    <Teleport to="body">
      <div
        v-if="manageOpen && selectedUser"
        class="fixed inset-0 z-50 overflow-y-auto"
      >
        <div class="fixed inset-0 bg-slate-950/60" @click="closeManageUser" />

        <div
          class="relative flex min-h-full items-start justify-center p-4 sm:items-center"
        >
          <div
            class="relative z-10 my-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <!-- HEADER -->
            <div
              class="flex items-start justify-between border-b border-slate-200 px-6 py-5"
            >
              <div>
                <h2 class="text-xl font-bold text-slate-900">Manage User</h2>

                <p class="mt-1 font-medium text-slate-700">
                  {{ selectedUser.user.firstName }}
                  {{ selectedUser.user.lastName }}
                </p>

                <p class="text-sm text-slate-500">
                  {{ selectedUser.user.email }}
                </p>
              </div>

              <button
                class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                type="button"
                @click="closeManageUser"
              >
                ✕
              </button>
            </div>

            <!-- BODY -->
            <div class="space-y-8 p-6">
              <!-- ROLE -->
              <section>
                <h3 class="font-semibold text-slate-900">User Role</h3>

                <p class="mt-1 text-sm text-slate-500">
                  Control the user's permissions inside this institute.
                </p>

                <div class="mt-4 flex flex-col gap-3 sm:flex-row">
                  <select
                    v-model="editRole"
                    class="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
                  >
                    <option
                      v-for="option in roleOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>

                  <button
                    :disabled="savingRole || editRole === selectedUser.role"
                    class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    type="button"
                    @click="saveRole"
                  >
                    {{ savingRole ? "Saving..." : "Update Role" }}
                  </button>
                </div>
              </section>

              <!-- STATUS -->
              <section class="border-t border-slate-200 pt-6">
                <h3 class="font-semibold text-slate-900">Membership Status</h3>

                <p class="mt-1 text-sm text-slate-500">
                  Disable access to this institute without deleting the
                  membership.
                </p>

                <div class="mt-4 flex flex-col gap-3 sm:flex-row">
                  <select
                    v-model="editStatus"
                    class="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
                  >
                    <option
                      v-for="option in statusOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>

                  <button
                    :disabled="
                      savingStatus || editStatus === selectedUser.status
                    "
                    class="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    type="button"
                    @click="saveStatus"
                  >
                    {{ savingStatus ? "Saving..." : "Update Status" }}
                  </button>
                </div>
              </section>

              <!-- SESSIONS -->
              <section class="border-t border-slate-200 pt-6">
                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 class="font-semibold text-slate-900">Login Sessions</h3>

                    <p class="mt-1 text-sm text-slate-500">
                      {{ activeSessionCount }}
                      active session{{ activeSessionCount === 1 ? "" : "s" }}
                    </p>
                  </div>

                  <button
                    :disabled="revokingAllSessions || activeSessionCount === 0"
                    class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    type="button"
                    @click="revokeAllSessions"
                  >
                    {{
                      revokingAllSessions
                        ? "Revoking..."
                        : "Revoke All Active Sessions"
                    }}
                  </button>
                </div>

                <!-- SESSION LOADING -->
                <div
                  v-if="loadingSessions"
                  class="mt-4 rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500"
                >
                  Loading sessions...
                </div>

                <!-- NO SESSIONS -->
                <div
                  v-else-if="sessions.length === 0"
                  class="mt-4 rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500"
                >
                  No login sessions found.
                </div>

                <!-- SESSION LIST -->
                <div v-else class="mt-4 space-y-3">
                  <div
                    v-for="session in sessions"
                    :key="session.id"
                    class="rounded-xl border border-slate-200 p-4"
                  >
                    <div
                      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="font-semibold text-slate-800">
                            {{ formatUserAgent(session.userAgent) }}
                          </p>

                          <span
                            :class="[
                              'rounded-full px-2.5 py-1 text-xs font-semibold',

                              sessionStatus(session) === 'ACTIVE'
                                ? 'bg-green-50 text-green-700'
                                : sessionStatus(session) === 'REVOKED'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-slate-100 text-slate-600',
                            ]"
                          >
                            {{ sessionStatus(session) }}
                          </span>
                        </div>

                        <div
                          class="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2"
                        >
                          <p>
                            IP:
                            {{ session.ipAddress || "Unknown" }}
                          </p>

                          <p>
                            Created:
                            {{ formatDate(session.createdAt) }}
                          </p>

                          <p>
                            Expires:
                            {{ formatDate(session.expiresAt) }}
                          </p>

                          <p v-if="session.revokedAt">
                            Revoked:
                            {{ formatDate(session.revokedAt) }}
                          </p>
                        </div>
                      </div>

                      <button
                        v-if="isSessionActive(session)"
                        :disabled="revokingSessionId === session.id"
                        class="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        type="button"
                        @click="revokeSession(session)"
                      >
                        {{
                          revokingSessionId === session.id
                            ? "Revoking..."
                            : "Revoke"
                        }}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <!-- DANGER ZONE -->
              <section class="border-t border-slate-200 pt-6">
                <div class="rounded-xl border border-red-200 bg-red-50 p-5">
                  <h3 class="font-semibold text-red-800">Danger Zone</h3>

                  <p class="mt-1 text-sm text-red-700">
                    Removing this user deletes their membership from this
                    institute and revokes their active institute sessions.
                  </p>

                  <div v-if="!showRemoveConfirmation" class="mt-4">
                    <button
                      class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                      type="button"
                      @click="requestRemoveUser"
                    >
                      Remove User
                    </button>
                  </div>

                  <!-- CONFIRMATION -->
                  <div
                    v-else
                    class="mt-4 rounded-lg border border-red-300 bg-white p-4"
                  >
                    <p class="text-sm font-semibold text-slate-900">
                      Remove
                      {{ selectedUser.user.firstName }}
                      {{ selectedUser.user.lastName }}?
                    </p>

                    <p class="mt-1 text-sm text-slate-600">
                      This user will lose access to the institute. This action
                      cannot be undone from this screen.
                    </p>

                    <div class="mt-4 flex flex-wrap gap-3">
                      <button
                        :disabled="removingUser"
                        class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        type="button"
                        @click="removeUser"
                      >
                        {{ removingUser ? "Removing..." : "Yes, Remove User" }}
                      </button>

                      <button
                        :disabled="removingUser"
                        class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        type="button"
                        @click="cancelRemoveUser"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <!-- FOOTER -->
            <div class="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                class="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                @click="closeManageUser"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
