<script setup lang="ts">
/**
 * Widget palette for the form designer (Phase 4, task 4.2). Searchable,
 * categorised list of the full DASH widget set. Click adds the widget to the
 * canvas (drag-and-drop is a later refinement); each item is also marked
 * `draggable` so the DnD wiring can hang off it without markup changes.
 */
import { computed, ref } from "vue";
import { CATEGORIES, WIDGETS, type WidgetDef } from "./widgets";
import { setDragImage } from "./dragImage";

const emit = defineEmits<{
  (e: "add", widgetId: string): void;
  (e: "dragstart", widgetId: string): void;
  (e: "dragend"): void;
}>();

const query = ref("");

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return WIDGETS;
  return WIDGETS.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.editor.toLowerCase().includes(q),
  );
});

function startDrag(w: WidgetDef, ev: DragEvent) {
  // setData is required for the drag to initiate in some browsers (Firefox).
  ev.dataTransfer?.setData("text/plain", w.id);
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "copy";
  setDragImage(ev, w.name);
  emit("dragstart", w.id);
}

const byCategory = computed(() =>
  CATEGORIES.map((category) => ({
    category,
    widgets: filtered.value.filter((w) => w.category === category),
  })).filter((c) => c.widgets.length > 0),
);
</script>

<template>
  <div class="palette">
    <input v-model="query" class="search" type="search" placeholder="Search widgets…" aria-label="Search widgets" />
    <div v-for="cat in byCategory" :key="cat.category" class="cat">
      <div class="cat__label">{{ cat.category }}</div>
      <button
        v-for="w in cat.widgets"
        :key="w.id"
        class="item"
        draggable="true"
        :title="w.editor"
        @click="emit('add', w.id)"
        @dragstart="startDrag(w, $event)"
        @dragend="emit('dragend')"
      >
        <span class="glyph" aria-hidden="true">{{ w.glyph }}</span>
        <span class="text">
          <span class="name">{{ w.name }}</span>
          <span class="desc">{{ w.description }}</span>
        </span>
      </button>
    </div>
    <p v-if="!byCategory.length" class="empty">No widgets match “{{ query }}”.</p>
  </div>
</template>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.search {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
}
.cat__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-2);
  margin-bottom: 4px;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--r-2);
  background: none;
  cursor: grab;
}
.item:hover {
  background: var(--accent-soft);
  border-color: var(--accent-line);
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
.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.desc {
  font-size: 11px;
  color: var(--muted);
}
.empty {
  font-size: 12px;
  color: var(--muted);
}
</style>
