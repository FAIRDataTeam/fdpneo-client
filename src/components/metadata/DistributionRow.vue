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
    <span :class="['chip', 'outline']" :style="{ color: restricted ? 'var(--signal)' : 'var(--ok)' }">
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
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  padding: 14px 16px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
}
.title__main {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  line-height: 1.3;
}
.title__meta {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
</style>
