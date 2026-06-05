<script setup lang="ts">
/**
 * A single shape rendered as a Vue Flow node (Phase 4, task 4.1): the shape's
 * label, target class, and property count, with left/right handles so
 * `sh:node`/`sh:class` edges can attach. Selection styling is driven by Vue
 * Flow's `selected` flag.
 */
import { Handle, Position } from "@vue-flow/core";
import type { ShapeNode } from "./graph";

defineProps<{ data: ShapeNode; selected?: boolean }>();
</script>

<template>
  <div class="shape-node" :class="{ selected }">
    <Handle type="target" :position="Position.Left" />
    <div class="shape-node__label">{{ data.label || data.shapeIri || "(unnamed)" }}</div>
    <div class="shape-node__tc mono">{{ data.targetClass || "no sh:targetClass" }}</div>
    <div class="shape-node__count">
      {{ data.propertyCount }} propert{{ data.propertyCount === 1 ? "y" : "ies" }}
    </div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.shape-node {
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  padding: 10px 12px;
  box-shadow: var(--shadow-1);
  font-family: var(--font-sans);
}
.shape-node.selected {
  border-color: var(--accent-line);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.shape-node__label {
  font-weight: 600;
  font-size: 13px;
  color: var(--ink);
}
.shape-node__tc {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
  word-break: break-all;
}
.shape-node__count {
  font-size: 11px;
  color: var(--muted-2);
  margin-top: 6px;
}
</style>
