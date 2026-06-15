<script setup lang="ts">
/**
 * LineageRail — the repository → catalog → … → record chain rendered as a
 * horizontal graph thread: a type-colored node per hop, connected by a hairline,
 * with the current record emphasized. Replaces the plain text breadcrumb so the
 * linked-data lineage (FDP's reason to exist) reads as the product's signature.
 *
 * Each hop's node color comes from the record-kind tokens (`--t-<kind>`) via the
 * `--node` custom property, so it stays in sync with `.type-tag` and card spines.
 */
import type { Crumb } from "@/composables/useAncestors";

defineProps<{ crumbs: Crumb[] }>();
</script>

<template>
  <nav class="lineage" aria-label="Lineage">
    <template v-for="(c, i) in crumbs" :key="i">
      <span v-if="i > 0" class="thread" aria-hidden="true" />
      <RouterLink
        v-if="c.to"
        :to="c.to"
        class="hop"
        :style="{ '--node': `var(--t-${c.type})` }"
      >
        <span class="node" aria-hidden="true" />
        <span class="hop__text">
          <span class="kind">{{ c.type }}</span>
          <span class="label">{{ c.label }}</span>
        </span>
      </RouterLink>
      <span
        v-else
        class="hop current"
        :style="{ '--node': `var(--t-${c.type})` }"
        aria-current="page"
      >
        <span class="node" aria-hidden="true" />
        <span class="hop__text">
          <span class="kind">{{ c.type }}</span>
          <span class="label">{{ c.label }}</span>
        </span>
      </span>
    </template>
  </nav>
</template>

<style scoped>
.lineage {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.thread {
  width: 22px;
  height: 2px;
  flex: none;
  background: linear-gradient(90deg, var(--line-strong), var(--line-strong));
  border-radius: 2px;
}
.hop {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  color: var(--ink-2);
  text-decoration: none;
}
.node {
  width: 13px;
  height: 13px;
  flex: none;
  border-radius: 4px;
  background: var(--surface);
  box-shadow: inset 0 0 0 2px var(--node, var(--muted));
}
.hop.current .node {
  background: var(--node);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--node) 20%, transparent);
}
.hop__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  line-height: 1.1;
}
.kind {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--node, var(--muted));
  font-weight: 500;
}
.label {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink-2);
}
a.hop:hover .label {
  color: var(--accent);
  text-decoration: underline;
}
.hop.current .label {
  color: var(--ink);
  font-weight: 600;
}
/* The current (last) hop's label may be long; let it shrink/ellipsize first. */
.hop.current {
  min-width: 0;
  flex: 0 1 auto;
}
</style>
