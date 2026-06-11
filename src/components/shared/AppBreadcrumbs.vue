<script setup lang="ts">
import { computed } from "vue";

/** A crumb is either a plain label or a label with a route target. */
type BreadcrumbItem = string | { label: string; to?: string | null };

const props = defineProps<{ items: BreadcrumbItem[] }>();

const crumbs = computed(() =>
  props.items.map((it) =>
    typeof it === "string" ? { label: it, to: null } : { label: it.label, to: it.to ?? null },
  ),
);
</script>

<template>
  <nav class="bc" aria-label="Breadcrumb">
    <template v-for="(it, i) in crumbs" :key="i">
      <span v-if="i > 0" class="sep">/</span>
      <RouterLink v-if="it.to" :to="it.to" class="crumb link">{{ it.label }}</RouterLink>
      <span v-else :class="['crumb', i === crumbs.length - 1 ? 'current' : '']">{{ it.label }}</span>
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
.crumb.link {
  color: var(--accent);
  text-decoration: none;
}
.crumb.link:hover {
  text-decoration: underline;
}
.crumb.current {
  color: var(--ink-2);
  font-weight: 500;
}
</style>
