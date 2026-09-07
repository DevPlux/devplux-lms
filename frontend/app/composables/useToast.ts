export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

export function useToast() {
  const toasts = useState<Toast[]>("global-toasts", () => []);

  function showToast(
    message: string,
    type: ToastType = "info",
    duration = 3500,
  ) {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    toasts.value.push({
      id,
      type,
      message,
      duration,
    });

    if (import.meta.client) {
      window.setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  function success(message: string, duration?: number) {
    return showToast(message, "success", duration);
  }

  function error(message: string, duration?: number) {
    return showToast(message, "error", duration);
  }

  function warning(message: string, duration?: number) {
    return showToast(message, "warning", duration);
  }

  function info(message: string, duration?: number) {
    return showToast(message, "info", duration);
  }

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
