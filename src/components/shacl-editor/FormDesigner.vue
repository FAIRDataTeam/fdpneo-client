<script setup lang="ts">
/**
 * Per-shape form designer (Phase 4, task 4.2): the handoff's 3-column workbench
 * — widget palette, form canvas (groups of field cards), and a field inspector.
 * Operates on the passed-in model and emits `update:doc` for every edit (run
 * through the pure `mutations`, which preserve client ids so field selection
 * stays stable across edits). Drag-and-drop is a later refinement; today the
 * palette adds on click.
 */
import { computed, ref, watch } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import WidgetPalette from "./WidgetPalette.vue";
import FieldCard from "./FieldCard.vue";
import FieldInspector from "./FieldInspector.vue";
import {
  addField,
  addGroup,
  deleteField,
  deleteGroup,
  duplicateField,
  updateField,
  updateGroup,
  updateShape,
} from "./mutations";
import type { Field, SchemaDocument } from "./model";

const props = defineProps<{ doc: SchemaDocument; shapeId: string }>();
const emit = defineEmits<{ (e: "update:doc", doc: SchemaDocument): void; (e: "back"): void }>();

const shape = computed(() => props.doc.shapes.find((s) => s.id === props.shapeId) ?? null);

const selectedFieldId = ref<string | null>(null);
const selectedField = computed<Field | null>(() => {
  if (!shape.value || !selectedFieldId.value) return null;
  for (const g of shape.value.groups) {
    const f = g.fields.find((x) => x.id === selectedFieldId.value);
    if (f) return f;
  }
  return null;
});

// Where palette clicks land: the selected field's group, else the first group.
const targetGroupId = computed<string | null>(() => {
  if (!shape.value) return null;
  if (selectedFieldId.value) {
    const g = shape.value.groups.find((x) => x.fields.some((f) => f.id === selectedFieldId.value));
    if (g) return g.id;
  }
  return shape.value.groups[0]?.id ?? null;
});

// Drop selection if the selected field disappears (e.g. its group was deleted).
watch(selectedField, (f) => {
  if (!f) selectedFieldId.value = null;
});

function apply(fn: (d: SchemaDocument) => SchemaDocument) {
  emit("update:doc", fn(props.doc));
}

function onAddWidget(widgetId: string) {
  const gid = targetGroupId.value;
  if (gid) apply((d) => addField(d, props.shapeId, gid, widgetId));
}
function onUpdateField(patch: Partial<Field>) {
  const id = selectedFieldId.value;
  if (id) apply((d) => updateField(d, props.shapeId, id, patch));
}
function onDeleteField(id: string) {
  if (selectedFieldId.value === id) selectedFieldId.value = null;
  apply((d) => deleteField(d, props.shapeId, id));
}
</script>

<template>
  <div v-if="shape" class="designer">
    <div class="bar">
      <button class="btn sm ghost" @click="emit('back')"><AppIcon name="chevron-l" :size="12" /> Shapes</button>
      <input
        class="schema-name"
        :value="shape.label"
        placeholder="Schema name"
        aria-label="Schema name"
        @input="apply((d) => updateShape(d, shapeId, { label: ($event.target as HTMLInputElement).value }))"
      />
      <input
        class="schema-tc mono"
        :value="shape.targetClass"
        placeholder="sh:targetClass"
        aria-label="Target class"
        @input="apply((d) => updateShape(d, shapeId, { targetClass: ($event.target as HTMLInputElement).value }))"
      />
    </div>

    <div class="grid">
      <!-- Palette -->
      <section class="panel">
        <header>WIDGETS <small>click to add · DASH</small></header>
        <div class="panel__body">
          <WidgetPalette @add="onAddWidget" />
        </div>
      </section>

      <!-- Canvas -->
      <section class="panel">
        <header>
          FORM CANVAS
          <button class="btn sm" @click="apply((d) => addGroup(d, shapeId))">+ Add group</button>
        </header>
        <div class="panel__body">
          <p v-if="!shape.groups.length" class="hint">Add a group, then add widgets to it.</p>
          <div v-for="g in shape.groups" :key="g.id" class="group">
            <div class="group__head">
              <AppIcon name="tree" :size="13" />
              <input
                :value="g.label"
                placeholder="Group label"
                aria-label="Group label"
                @input="apply((d) => updateGroup(d, shapeId, g.id, { label: ($event.target as HTMLInputElement).value }))"
              />
              <button class="icon" title="Delete group" @click="apply((d) => deleteGroup(d, shapeId, g.id))">
                <AppIcon name="x" :size="13" />
              </button>
            </div>
            <div class="group__body">
              <p v-if="!g.fields.length" class="drop">Add a widget from the palette.</p>
              <FieldCard
                v-for="f in g.fields"
                :key="f.id"
                :field="f"
                :selected="f.id === selectedFieldId"
                @select="selectedFieldId = f.id"
                @duplicate="apply((d) => duplicateField(d, shapeId, f.id))"
                @delete="onDeleteField(f.id)"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Inspector -->
      <section class="panel">
        <header>INSPECTOR</header>
        <div class="panel__body">
          <FieldInspector v-if="selectedField" :field="selectedField" @update="onUpdateField" />
          <p v-else class="hint">Select a field to edit its constraints, or adjust the schema name / target class above.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.designer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.schema-name {
  font-weight: 600;
  font-size: 14px;
}
.schema-name,
.schema-tc {
  padding: 6px 9px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
}
.schema-tc {
  flex: 1;
  font-size: 12px;
}
.grid {
  display: grid;
  grid-template-columns: 240px minmax(320px, 1fr) 320px;
  gap: 14px;
  min-height: 520px;
}
.panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
  overflow: hidden;
}
.panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted-2);
}
.panel > header small {
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--muted);
}
.panel__body {
  padding: 12px;
  overflow: auto;
  flex: 1;
}
.group {
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  margin-bottom: 12px;
}
.group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--accent-soft);
  border-bottom: 1px solid var(--line);
  border-radius: var(--r-2) var(--r-2) 0 0;
}
.group__head input {
  flex: 1;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.group__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}
.drop {
  font-size: 12px;
  color: var(--muted);
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-2);
  padding: 12px;
  text-align: center;
  margin: 0;
}
.hint {
  font-size: 12px;
  color: var(--muted);
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
  background: var(--surface-2);
  color: var(--signal);
}
</style>
