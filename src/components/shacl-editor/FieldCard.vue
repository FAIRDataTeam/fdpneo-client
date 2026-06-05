<script setup lang="ts">
/**
 * A single `sh:property` rendered as a field card in the form canvas (Phase 4,
 * task 4.2): widget glyph, name (with a required marker and a "multi" badge),
 * a mono meta line (`path · datatype|class|editor`), and select/duplicate/
 * delete affordances.
 */
import { computed } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import type { Field } from "./model";
import { WIDGET_BY_ID } from "./widgets";

const props = defineProps<{ field: Field; selected?: boolean; violations?: string[] }>();
const emit = defineEmits<{
  (e: "select"): void;
  (e: "duplicate"): void;
  (e: "delete"): void;
  (e: "dragstart", ev: DragEvent): void;
  (e: "dragend"): void;
  (e: "move", dir: number): void;
}>();

// Keyboard: Enter/Space selects; Alt+Arrow reorders (the accessible alternative
// to drag-and-drop).
function onKey(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    emit("select");
  } else if (e.altKey && e.key === "ArrowUp") {
    e.preventDefault();
    emit("move", -1);
  } else if (e.altKey && e.key === "ArrowDown") {
    e.preventDefault();
    emit("move", 1);
  }
}

const glyph = computed(() => WIDGET_BY_ID[props.field.widgetId]?.glyph ?? "?");
const required = computed(() => (props.field.minCount ?? 0) > 0);
// maxCount null = unbounded, or > 1 ⇒ repeatable ("multi"); exactly 1 = single.
const multi = computed(() => props.field.maxCount === null || (props.field.maxCount ?? 1) > 1);
const meta = computed(() => {
  const range = props.field.datatype || props.field.class || props.field.node || props.field.editor || "";
  return [props.field.path, range].filter(Boolean).join(" · ");
});
</script>

<template>
  <div
    class="card"
    :class="{ selected, 'has-violation': violations && violations.length }"
    draggable="true"
    tabindex="0"
    role="button"
    :aria-pressed="selected"
    :aria-label="`${field.name || 'unnamed'} field${required ? ', required' : ''}. Enter to edit, Alt+Arrow to reorder.`"
    @click="emit('select')"
    @keydown="onKey"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend')"
  >
    <span class="grip" aria-hidden="true" title="Drag to reorder"><AppIcon name="grip" :size="14" /></span>
    <span class="glyph" aria-hidden="true">{{ glyph }}</span>
    <div class="main">
      <div class="title">
        <span class="name">{{ field.name || "(unnamed)" }}</span>
        <span v-if="required" class="req" title="Required (sh:minCount ≥ 1)">●</span>
        <span v-if="multi" class="badge">multi</span>
        <span v-if="violations && violations.length" class="viol" :title="violations.join('; ')">
          ⚠ {{ violations.length }}
        </span>
      </div>
      <div class="meta mono">{{ meta }}</div>
    </div>
    <div class="actions">
      <button class="icon" title="Duplicate" @click.stop="emit('duplicate')">
        <AppIcon name="plus" :size="13" />
      </button>
      <button class="icon" title="Delete" @click.stop="emit('delete')">
        <AppIcon name="x" :size="13" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
  cursor: pointer;
}
.card.selected {
  border-color: var(--accent-line);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.card.has-violation {
  border-color: var(--signal);
  box-shadow: inset 3px 0 0 var(--signal);
}
.viol {
  font-size: 10px;
  font-weight: 700;
  color: var(--signal);
  background: var(--signal-soft);
  padding: 1px 5px;
  border-radius: var(--r-1);
}
.grip {
  display: grid;
  place-items: center;
  color: var(--muted-2);
  cursor: grab;
  margin-left: -2px;
}
.card:active .grip {
  cursor: grabbing;
}
.glyph {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: var(--r-2);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 15px;
}
.main {
  flex: 1;
  min-width: 0;
}
.title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.req {
  color: var(--signal);
  font-size: 10px;
}
.badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 5px;
  border-radius: var(--r-1);
}
.meta {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.actions {
  display: flex;
  gap: 2px;
}
.icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: none;
  background: none;
  border-radius: var(--r-1);
  color: var(--muted);
  cursor: pointer;
}
.icon:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
