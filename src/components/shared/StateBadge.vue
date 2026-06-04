<script setup lang="ts">
/**
 * Publication-state chip (TASKS 10.3): green published, grey archived,
 * signal-coloured draft. Renders nothing when state is unknown/null, so callers
 * can drop it in unconditionally.
 */
import { computed } from "vue";
import AppChip from "@/components/shared/AppChip.vue";

const props = defineProps<{ state: string | null | undefined }>();

const meta = computed(() => {
  const s = props.state?.toUpperCase();
  if (!s) return null;
  const label = s.charAt(0) + s.slice(1).toLowerCase();
  if (s === "PUBLISHED") return { label, variant: "ok" as const };
  if (s === "ARCHIVED") return { label, variant: "default" as const };
  return { label, variant: "signal" as const }; // DRAFT / anything else
});
</script>

<template>
  <AppChip v-if="meta" :variant="meta.variant">{{ meta.label }}</AppChip>
</template>
