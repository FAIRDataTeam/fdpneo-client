<script setup lang="ts">
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import AppChip from "@/components/shared/AppChip.vue";

defineProps<{ breadcrumbs: string[]; version: string }>();
</script>

<template>
  <div class="bar">
    <AppBreadcrumbs :items="breadcrumbs" />
    <div class="spacer" />
    <AppChip variant="ok" dot>Published · v{{ version }}</AppChip>
    <AppChip>
      <AppIcon name="user" :size="11" /> You own this record
    </AppChip>
    <button class="btn ghost sm">
      <AppIcon name="code" :size="12" /> Turtle
    </button>
    <button class="btn ghost sm" aria-label="More actions">
      <AppIcon name="dots" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 40px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  font-size: 13px;
}
.spacer {
  flex: 1;
}
</style>
