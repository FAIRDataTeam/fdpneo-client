<script setup lang="ts">
/**
 * Admin-only readiness indicator for the footer.
 *
 * Reads `GET /readyz` via `useReadiness` (which is itself disabled for
 * non-admins) and renders a compact status chip: green when every dependency
 * is up, signal-coloured when one or more checks fail, with the per-check
 * detail in the `title` for hover inspection. Renders nothing for non-admins
 * or while the first probe is in flight, so it never adds noise for the
 * common (anonymous / steward) case.
 */
import { computed } from "vue";
import AppChip from "@/components/shared/AppChip.vue";
import { useReadiness } from "@/composables/useAppInfo";
import { failedChecks } from "@/api/info";

const { data, isError } = useReadiness();

const ready = computed(() => data.value?.status === "ready");

const failed = computed(() => (data.value ? failedChecks(data.value) : []));

const label = computed(() => {
  if (isError.value) return "Readiness unknown";
  if (!data.value) return "";
  return ready.value ? "All systems ready" : `Degraded: ${failed.value.join(", ")}`;
});

/** Per-check breakdown for the hover tooltip, e.g. "postgres: ok · oidc: fail". */
const detail = computed(() => {
  if (!data.value) return "";
  return Object.entries(data.value.checks)
    .map(([name, outcome]) => `${name}: ${outcome.status}`)
    .join(" · ");
});

const show = computed(() => isError.value || !!data.value);
</script>

<template>
  <AppChip
    v-if="show"
    :variant="ready && !isError ? 'ok' : 'signal'"
    dot
    :title="detail || undefined"
    role="status"
    :aria-label="`Server readiness: ${label}`"
  >
    {{ label }}
  </AppChip>
</template>
