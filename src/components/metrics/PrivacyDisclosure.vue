<script setup lang="ts">
/**
 * Surfaces what the FDP metrics API does NOT track, per architecture §11
 * and ADR-0002. Click reveals the full list; the inline icon is the always-
 * visible hint.
 */
import { ref } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const open = ref(false);
</script>

<template>
  <div class="wrap">
    <button
      type="button"
      class="trigger"
      :aria-expanded="open"
      aria-controls="privacy-body"
      @click="open = !open"
    >
      <AppIcon name="shield" :size="13" /> Privacy disclaimer
      <AppIcon :name="open ? 'chevron-d' : 'chevron-r'" :size="11" />
    </button>
    <div v-if="open" id="privacy-body" class="body">
      <p>
        This dashboard renders only what the server's anonymous metrics API
        returns. By design, the FDP does <strong>not</strong> store:
      </p>
      <ul>
        <li>Per-user identifiers, IP addresses, or session correlation</li>
        <li>SPARQL query text — only that a query happened and its latency</li>
        <li>Cross-day unique-visitor derivations (counts rotate daily)</li>
        <li>Referrer chains or precise geolocation finer than country/region</li>
      </ul>
      <p class="muted">
        Anything labelled "—" below means the underlying signal is intentionally
        not collected, not that it's missing.
      </p>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
}
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font: 500 12px/1 var(--font-sans);
  color: var(--ink-2);
  cursor: pointer;
}
.trigger:hover {
  background: var(--surface-2);
}
.body {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  box-shadow: var(--shadow-2);
  z-index: 20;
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.55;
  color: var(--ink-2);
}
.body p {
  margin: 0 0 8px;
}
.body ul {
  margin: 0 0 8px;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}
.body .muted {
  color: var(--muted);
}
</style>
