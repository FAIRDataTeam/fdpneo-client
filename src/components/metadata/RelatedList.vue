<script setup lang="ts">
import type { Related } from "@/data/sampleRecord";

defineProps<{ items: Related[] }>();
</script>

<template>
  <div class="list">
    <RouterLink
      v-for="rel in items"
      :key="rel.id"
      :to="`/records/${rel.id}`"
      class="item"
    >
      <div class="type mono">{{ rel.typeLabel }}</div>
      <div class="title">{{ rel.title }}</div>
    </RouterLink>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 8px;
}
.item {
  display: block;
  text-decoration: none;
  color: inherit;
}
.type {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}
.title {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1.35;
  color: var(--ink);
}
.item:hover .title {
  color: var(--accent);
}
</style>
