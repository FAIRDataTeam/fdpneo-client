<script setup lang="ts">
/**
 * A single shape rendered as a Vue Flow node (Phase 4, task 4.1): the shape's
 * label, target class, and property count, with left/right handles so
 * `sh:node`/`sh:class` edges can attach. Selection styling is driven by Vue
 * Flow's `selected` flag. A **ghost** node is a registered resource type with
 * no shape in this schema — rendered muted/dashed and non-interactive.
 */
import { Handle, Position } from "@vue-flow/core";
import type { ShapeNode } from "./graph";

const props = defineProps<{ data: ShapeNode; selected?: boolean; violations?: number }>();
const emit = defineEmits<{ (e: "activate"): void }>();

function onKey(e: KeyboardEvent) {
  if (props.data.ghost) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    emit("activate");
  }
}
</script>

<template>
  <div
    class="shape-node"
    :class="{ selected, ghost: data.ghost }"
    :tabindex="data.ghost ? -1 : 0"
    :role="data.ghost ? undefined : 'button'"
    :aria-pressed="data.ghost ? undefined : selected"
    :aria-label="
      data.ghost
        ? `Type ${data.label || data.targetClass} — no shape in this schema yet`
        : `Shape ${data.label || data.shapeIri}, ${data.propertyCount} properties. Enter to edit.`
    "
    @keydown="onKey"
  >
    <Handle type="target" :position="Position.Left" />
    <div class="shape-node__label">{{ data.label || data.shapeIri || data.targetClass || "(unnamed)" }}</div>
    <div class="shape-node__tc mono">{{ data.targetClass || "no sh:targetClass" }}</div>
    <div class="shape-node__count">
      <template v-if="data.ghost">no shape yet</template>
      <template v-else>
        {{ data.propertyCount }} propert{{ data.propertyCount === 1 ? "y" : "ies" }}
        <span v-if="violations" class="shape-node__viol" :title="`${violations} field(s) failed validation`">
          ⚠ {{ violations }}
        </span>
      </template>
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
.shape-node:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.shape-node.ghost {
  border-style: dashed;
  border-color: var(--line-strong);
  background: var(--surface-2);
  opacity: 0.75;
  box-shadow: none;
}
.shape-node.ghost .shape-node__label {
  color: var(--muted);
}
.shape-node.ghost .shape-node__count {
  font-style: italic;
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
.shape-node__viol {
  margin-left: 6px;
  font-weight: 700;
  color: var(--signal);
  background: var(--signal-soft);
  padding: 1px 5px;
  border-radius: var(--r-1);
}
</style>
