<script setup lang="ts">
/**
 * Three-state theme toggle: system / light / dark.
 *
 * Clicking cycles through the three states. The store also exposes `setMode`
 * for callers that prefer a popover/menu in the future.
 */
import { useThemeStore } from "@/stores/theme";
import AppIcon from "./AppIcon.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const theme = useThemeStore();
const { t } = useI18n();

const label = computed(() => {
  switch (theme.mode) {
    case "light":
      return t("theme.light");
    case "dark":
      return t("theme.dark");
    default:
      return t("theme.system");
  }
});

const icon = computed(() => {
  if (theme.mode === "light") return "sun";
  if (theme.mode === "dark") return "moon";
  return "monitor";
});
</script>

<template>
  <button
    class="btn ghost sm"
    :aria-label="label"
    :title="label"
    @click="theme.cycle()"
  >
    <AppIcon :name="icon" :size="14" />
  </button>
</template>
