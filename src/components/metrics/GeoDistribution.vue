<script setup lang="ts">
/**
 * Bar list of visitors by country. Country-granularity is the deepest the
 * server reports — finer-grained geolocation is deliberately not collected.
 */
import { computed } from "vue";
import type { CountryRow } from "@/api/metrics";

const props = defineProps<{ rows: CountryRow[] }>();

const max = computed(() => props.rows.reduce((m, r) => Math.max(m, r.visitors), 1));
</script>

<template>
  <ul class="list">
    <li v-for="r in rows" :key="r.code" class="row">
      <span class="code mono">{{ r.code }}</span>
      <span class="label">{{ r.label }}</span>
      <span class="bar" :style="{ width: `${(r.visitors / max) * 100}%` }" />
      <span class="count mono">{{ r.visitors }}</span>
    </li>
  </ul>
</template>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
}
.row {
  display: grid;
  grid-template-columns: 28px 1fr 80px auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--r-2);
  background: var(--surface);
  border: 1px solid var(--line);
}
.code {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.label {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar {
  display: inline-block;
  height: 6px;
  background: var(--accent);
  border-radius: 4px;
  min-width: 4px;
  justify-self: end;
  align-self: center;
}
.count {
  font-size: 12px;
  color: var(--ink-2);
  text-align: right;
  min-width: 32px;
}
</style>
