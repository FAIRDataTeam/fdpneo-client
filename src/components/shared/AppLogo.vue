<script setup lang="ts">
/**
 * FDP lockup — FAIR Ecosystem design system.
 *
 * The node-and-edge glyph (a linked-data node on a stem — the ecosystem's
 * recurring figure) + an "FAIR Data Point" wordmark in IBM Plex Sans. The ring
 * and stem take `currentColor` (ink, so they flip light in dark mode); the inner
 * node is the FDP teal accent. A deployer-configured logo replaces the lockup.
 */
import { useBranding } from "@/composables/useBranding";

const props = withDefaults(
  defineProps<{ size?: number; showNeo?: boolean }>(),
  { size: 24, showNeo: true },
);

// Deployer white-label: a configured logo replaces the built-in lockup entirely.
const { logoUrl, orgName } = useBranding();
</script>

<template>
  <img
    v-if="logoUrl"
    class="brand-logo"
    :src="logoUrl"
    :alt="orgName ?? 'FAIR Data Point'"
    :style="{ height: `${props.size + 8}px` }"
  />
  <span v-else class="logo" aria-label="FAIR Data Point">
    <svg
      class="mark"
      :width="props.size + 6"
      :height="props.size + 6"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="27" r="13" stroke="currentColor" stroke-width="2.8" />
      <line x1="32" y1="40" x2="32" y2="52" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" />
      <circle cx="32" cy="27" r="5.6" fill="var(--tool-accent)" />
    </svg>
    <span class="wordmark" :style="{ fontSize: `${props.size * 0.72}px` }">FAIR Data Point</span>
  </span>
</template>

<style scoped>
.brand-logo {
  display: block;
  width: auto;
  max-width: 220px;
  object-fit: contain;
}
.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--fair-ink);
  text-decoration: none;
}
.mark {
  flex: none;
  display: block;
}
.wordmark {
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-semibold);
  letter-spacing: var(--fair-tracking-tight);
  line-height: 1;
  color: var(--fair-text-strong);
  white-space: nowrap;
}
</style>
