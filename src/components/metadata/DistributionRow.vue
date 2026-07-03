<script setup lang="ts">
import type { Distribution } from "@/data/sampleRecord";
import AppIcon from "@/components/shared/AppIcon.vue";
import { computed } from "vue";

const props = defineProps<{ distribution: Distribution }>();

const restricted = computed(() => props.distribution.access.toLowerCase().includes("required"));
const isSparql = computed(() => props.distribution.id === "sparql");
</script>

<template>
  <div class="row">
    <div class="title">
      <div class="title__main">{{ distribution.title }}</div>
      <div class="title__meta mono">
        {{ distribution.format }}{{ distribution.size ? ` · ${distribution.size}` : "" }}
      </div>
    </div>
    <span :class="['chip', 'outline']" :style="{ color: restricted ? 'var(--fair-warning)' : 'var(--fair-success)' }">
      <AppIcon :name="restricted ? 'lock' : 'check'" :size="11" />
      {{ distribution.access }}
    </span>
    <button class="btn">
      <AppIcon :name="isSparql ? 'code' : 'download'" :size="13" />
      {{ isSparql ? "Query" : "Get" }}
    </button>
  </div>
</template>

<style scoped>
.row {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  padding: 14px 16px;
  align-items: center;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  background: var(--fair-surface);
}
/* type-color spine (Phase 13.4): distributions are always the distribution kind. */
.row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 3px;
  background: var(--t-distribution);
}
.title__main {
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 14px;
  line-height: 1.3;
}
.title__meta {
  font-size: 11px;
  color: var(--fair-text-muted);
  margin-top: 2px;
}
</style>
