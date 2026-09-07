<script lang="ts" setup>
import type { Toast } from "~/composables/useToast";

const { toasts, removeToast } = useToast();

function toastClasses(type: Toast["type"]) {
  switch (type) {
    case "success":
      return {
        container: "border-green-200 bg-white",
        icon: "bg-green-100 text-green-600",
      };

    case "error":
      return {
        container: "border-red-200 bg-white",
        icon: "bg-red-100 text-red-600",
      };

    case "warning":
      return {
        container: "border-amber-200 bg-white",
        icon: "bg-amber-100 text-amber-600",
      };

    default:
      return {
        container: "border-blue-200 bg-white",
        icon: "bg-blue-100 text-blue-600",
      };
  }
}

function toastTitle(type: Toast["type"]) {
  switch (type) {
    case "success":
      return "Success";

    case "error":
      return "Error";

    case "warning":
      return "Warning";

    default:
      return "Information";
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
    >
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-x-6 opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-6 opacity-0"
        move-class="transition duration-300"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto overflow-hidden rounded-xl border shadow-lg',
            toastClasses(toast.type).container,
          ]"
        >
          <div class="flex items-start gap-3 p-4">
            <!-- ICON -->
            <div
              :class="[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                toastClasses(toast.type).icon,
              ]"
            >
              <!-- SUCCESS -->
              <svg
                v-if="toast.type === 'success'"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="m5 12 4 4L19 6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

              <!-- ERROR -->
              <svg
                v-else-if="toast.type === 'error'"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18 18 6M6 6l12 12"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

              <!-- WARNING -->
              <svg
                v-else-if="toast.type === 'warning'"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 9v4m0 4h.01M10.3 3.8 2.5 17.3A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.7L13.7 3.8a2 2 0 0 0-3.4 0Z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

              <!-- INFO -->
              <svg
                v-else
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="9" />

                <path d="M12 11v5M12 8h.01" stroke-linecap="round" />
              </svg>
            </div>

            <!-- MESSAGE -->
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-900">
                {{ toastTitle(toast.type) }}
              </p>

              <p class="mt-0.5 break-words text-sm leading-5 text-slate-600">
                {{ toast.message }}
              </p>
            </div>

            <!-- CLOSE -->
            <button
              aria-label="Close notification"
              class="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              type="button"
              @click="removeToast(toast.id)"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
