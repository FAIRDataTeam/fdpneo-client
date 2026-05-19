/**
 * Theme store.
 *
 * Tracks the user's theme preference: 'light', 'dark', or 'system'. When set
 * to 'system' the resolved theme follows the OS-level prefers-color-scheme.
 *
 * In-memory only — CLAUDE.md forbids browser storage for app state. On reload
 * the store reverts to 'system', which is the friendly default.
 */

import { defineStore } from "pinia";
import { computed, ref, watchEffect } from "vue";

export type ThemeMode = "light" | "dark" | "system";

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>("system");
  const systemPrefersDark = ref(false);

  const resolvedTheme = computed<"light" | "dark">(() => {
    if (mode.value === "system") return systemPrefersDark.value ? "dark" : "light";
    return mode.value;
  });

  watchEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (resolvedTheme.value === "dark") root.classList.add("theme-dark");
    else root.classList.remove("theme-dark");
  });

  function setMode(next: ThemeMode) {
    mode.value = next;
  }

  function cycle() {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const i = order.indexOf(mode.value);
    const next = order[(i + 1) % order.length];
    if (next) mode.value = next;
  }

  function setSystemPrefersDark(value: boolean) {
    systemPrefersDark.value = value;
  }

  return { mode, resolvedTheme, setMode, cycle, setSystemPrefersDark };
});
