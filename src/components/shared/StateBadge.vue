<script setup lang="ts">
/**
 * Publication-state chip (TASKS 10.3): green published, grey archived,
 * signal-coloured draft. Renders nothing when state is unknown/null, so callers
 * can drop it in unconditionally.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppChip from "@/components/shared/AppChip.vue";

const { t } = useI18n();
const props = defineProps<{ state: string | null | undefined }>();

const meta = computed(() => {
  const s = props.state?.toUpperCase();
  if (!s) return null;
  if (s === "PUBLISHED") return { label: t("state.published"), variant: "ok" as const };
  if (s === "ARCHIVED") return { label: t("state.archived"), variant: "default" as const };
  return { label: t("state.draft"), variant: "signal" as const }; // DRAFT / anything else
});
</script>

<template>
  <AppChip v-if="meta" :variant="meta.variant">{{ meta.label }}</AppChip>
</template>
