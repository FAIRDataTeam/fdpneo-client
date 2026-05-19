/**
 * Reactive wrapper around `prefers-color-scheme: dark`.
 *
 * Returns a Vue ref that updates when the OS-level preference changes. SSR-safe:
 * if `window` is not available, the ref stays `false`.
 */

import { onMounted, onUnmounted, ref } from "vue";

export function usePrefersDark() {
  const prefersDark = ref(false);

  if (typeof window === "undefined" || !window.matchMedia) {
    return prefersDark;
  }

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  prefersDark.value = mql.matches;

  const onChange = (e: MediaQueryListEvent) => {
    prefersDark.value = e.matches;
  };

  onMounted(() => mql.addEventListener("change", onChange));
  onUnmounted(() => mql.removeEventListener("change", onChange));

  return prefersDark;
}
