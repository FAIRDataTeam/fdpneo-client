<script setup lang="ts">
defineProps<{ items: string[] }>();
</script>

<template>
  <nav class="bc" aria-label="Breadcrumb">
    <template v-for="(it, i) in items" :key="i">
      <span v-if="i > 0" class="sep">/</span>
      <span :class="['crumb', i === items.length - 1 ? 'current' : '']">{{ it }}</span>
    </template>
  </nav>
</template>

<style scoped>
.bc {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}
.sep {
  color: var(--muted-2);
}
.crumb {
  font-weight: 400;
}
.crumb.current {
  color: var(--ink-2);
  font-weight: 500;
}
</style>
