<script setup lang="ts">
/**
 * Per-shape form designer (Phase 4, task 4.2): the handoff's 3-column workbench
 * — widget palette, form canvas (groups of field cards), and a field inspector.
 * Operates on the passed-in model and emits `update:doc` for every edit (run
 * through the pure `mutations`, which preserve client ids so selection stays
 * stable across edits). The inspector is context-sensitive (field / group /
 * schema). Widgets drag or click onto the canvas; field cards drag to reorder.
 */
import { computed, ref, watch } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import WidgetPalette from "./WidgetPalette.vue";
import FieldCard from "./FieldCard.vue";
import FieldInspector from "./FieldInspector.vue";
import GroupInspector from "./GroupInspector.vue";
import SchemaInspector from "./SchemaInspector.vue";
import {
  addField,
  addGroup,
  deleteField,
  deleteGroup,
  duplicateField,
  moveField,
  setPrefixes,
  updateField,
  updateGroup,
  updateShape,
} from "./mutations";
import type { Field, Group, SchemaDocument, ShapeModel } from "./model";
import type { PrefixDecl } from "@/rdf/namespaces";

type Drag = { kind: "widget"; widgetId: string } | { kind: "field"; fieldId: string };
// The inspector context: a field, a group, or the schema (the default).
type Selection = { kind: "field"; id: string } | { kind: "group"; id: string } | { kind: "schema" };

const props = defineProps<{ doc: SchemaDocument; shapeId: string }>();
const emit = defineEmits<{ (e: "update:doc", doc: SchemaDocument): void; (e: "back"): void }>();

const shape = computed(() => props.doc.shapes.find((s) => s.id === props.shapeId) ?? null);

const sel = ref<Selection>({ kind: "schema" });

const selectedField = computed<Field | null>(() => {
  const s = sel.value;
  if (s.kind !== "field" || !shape.value) return null;
  for (const g of shape.value.groups) {
    const f = g.fields.find((x) => x.id === s.id);
    if (f) return f;
  }
  return null;
});
const selectedGroup = computed<Group | null>(() => {
  const s = sel.value;
  if (s.kind !== "group" || !shape.value) return null;
  return shape.value.groups.find((g) => g.id === s.id) ?? null;
});

// Where palette adds land: the selected group, the selected field's group, else the first.
const targetGroupId = computed<string | null>(() => {
  const s = sel.value;
  if (!shape.value) return null;
  if (s.kind === "group") return s.id;
  if (s.kind === "field") {
    const g = shape.value.groups.find((x) => x.fields.some((f) => f.id === s.id));
    if (g) return g.id;
  }
  return shape.value.groups[0]?.id ?? null;
});

// Fall back to the schema inspector if the selected field/group disappears.
watch([selectedField, selectedGroup], () => {
  if (sel.value.kind === "field" && !selectedField.value) sel.value = { kind: "schema" };
  if (sel.value.kind === "group" && !selectedGroup.value) sel.value = { kind: "schema" };
});

function apply(fn: (d: SchemaDocument) => SchemaDocument) {
  emit("update:doc", fn(props.doc));
}

function onAddWidget(widgetId: string) {
  const gid = targetGroupId.value;
  if (gid) apply((d) => addField(d, props.shapeId, gid, widgetId));
}
function onUpdateField(patch: Partial<Field>) {
  const s = sel.value;
  if (s.kind === "field") apply((d) => updateField(d, props.shapeId, s.id, patch));
}
function onDeleteField(id: string) {
  if (sel.value.kind === "field" && sel.value.id === id) sel.value = { kind: "schema" };
  apply((d) => deleteField(d, props.shapeId, id));
}
function onUpdateGroup(patch: Partial<Pick<Group, "label" | "order">>) {
  const s = sel.value;
  if (s.kind === "group") apply((d) => updateGroup(d, props.shapeId, s.id, patch));
}
function onDeleteGroup() {
  const s = sel.value;
  if (s.kind === "group") {
    apply((d) => deleteGroup(d, props.shapeId, s.id));
    sel.value = { kind: "schema" };
  }
}
function onMoveField(fieldId: string, dir: number) {
  const s = shape.value;
  if (!s) return;
  for (const g of s.groups) {
    const i = g.fields.findIndex((f) => f.id === fieldId);
    if (i === -1) continue;
    if (i + dir < 0 || i + dir >= g.fields.length) return; // at a boundary
    apply((d) => moveField(d, props.shapeId, fieldId, g.id, i + dir));
    return;
  }
}
function onUpdateShape(patch: Partial<ShapeModel>) {
  apply((d) => updateShape(d, props.shapeId, patch));
}
function onUpdatePrefixes(list: PrefixDecl[]) {
  apply((d) => setPrefixes(d, list));
}

// --- Drag and drop -------------------------------------------------------
// `drag` is what's being dragged (a palette widget or an existing field);
// `dropAt` is the live insertion point (group + index) for the indicator bar.
const drag = ref<Drag | null>(null);
const dropAt = ref<{ groupId: string; index: number } | null>(null);

function onPaletteDragStart(widgetId: string) {
  drag.value = { kind: "widget", widgetId };
}
function onFieldDragStart(fieldId: string, ev: DragEvent) {
  drag.value = { kind: "field", fieldId };
  ev.dataTransfer?.setData("text/plain", fieldId);
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "move";
}
function onDragEnd() {
  drag.value = null;
  dropAt.value = null;
}
function onCardDragOver(groupId: string, index: number, ev: DragEvent) {
  if (!drag.value) return;
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
  const after = ev.clientY > rect.top + rect.height / 2;
  dropAt.value = { groupId, index: after ? index + 1 : index };
}
function onBodyDragOver(groupId: string, count: number) {
  // Padding area below the cards → insert at the end (cards stop propagation).
  if (drag.value) dropAt.value = { groupId, index: count };
}
function onDrop(groupId: string) {
  const d = drag.value;
  if (!d) return;
  const index = dropAt.value?.groupId === groupId ? dropAt.value.index : undefined;
  if (d.kind === "widget") {
    apply((doc) => addField(doc, props.shapeId, groupId, d.widgetId, index));
  } else {
    apply((doc) => moveField(doc, props.shapeId, d.fieldId, groupId, index ?? Number.MAX_SAFE_INTEGER));
  }
  onDragEnd();
}
function barAt(groupId: string, index: number): boolean {
  return !!drag.value && dropAt.value?.groupId === groupId && dropAt.value.index === index;
}
function overEmpty(groupId: string): boolean {
  return !!drag.value && dropAt.value?.groupId === groupId;
}
</script>

<template>
  <div v-if="shape" class="designer">
    <div class="bar">
      <button class="btn sm ghost" @click="emit('back')"><AppIcon name="chevron-l" :size="12" /> Shapes</button>
      <div class="bar__title">
        {{ shape.label || shape.shapeIri || "Shape" }}
        <span class="mono">· {{ shape.targetClass || "no sh:targetClass" }}</span>
      </div>
      <button class="btn sm" :class="{ active: sel.kind === 'schema' }" @click="sel = { kind: 'schema' }">
        <AppIcon name="cog" :size="12" /> Schema settings
      </button>
    </div>

    <div class="grid">
      <!-- Palette -->
      <section class="panel" role="region" aria-label="Widget palette">
        <header>WIDGETS <small>drag or click · DASH</small></header>
        <div class="panel__body">
          <WidgetPalette @add="onAddWidget" @dragstart="onPaletteDragStart" @dragend="onDragEnd" />
        </div>
      </section>

      <!-- Canvas -->
      <section class="panel" role="region" aria-label="Form canvas">
        <header>
          FORM CANVAS
          <button class="btn sm" @click="apply((d) => addGroup(d, shapeId))">+ Add group</button>
        </header>
        <div class="panel__body">
          <p v-if="!shape.groups.length" class="hint">Add a group, then add widgets to it.</p>
          <div v-for="g in shape.groups" :key="g.id" class="group">
            <div class="group__head" :class="{ selected: selectedGroup?.id === g.id }">
              <button class="ghead-sel" title="Group settings" @click="sel = { kind: 'group', id: g.id }">
                <AppIcon name="tree" :size="13" />
              </button>
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
            <div
              class="group__body"
              @dragover.prevent="onBodyDragOver(g.id, g.fields.length)"
              @drop.prevent="onDrop(g.id)"
            >
              <p v-if="!g.fields.length" class="drop" :class="{ over: overEmpty(g.id) }">
                Drop a widget here.
              </p>
              <template v-for="(f, i) in g.fields" :key="f.id">
                <div class="dropbar" :class="{ show: barAt(g.id, i) }"></div>
                <div class="cardwrap" @dragover.prevent.stop="onCardDragOver(g.id, i, $event)">
                  <FieldCard
                    :field="f"
                    :selected="selectedField?.id === f.id"
                    @select="sel = { kind: 'field', id: f.id }"
                    @duplicate="apply((d) => duplicateField(d, shapeId, f.id))"
                    @delete="onDeleteField(f.id)"
                    @move="onMoveField(f.id, $event)"
                    @dragstart="onFieldDragStart(f.id, $event)"
                    @dragend="onDragEnd"
                  />
                </div>
              </template>
              <div class="dropbar" :class="{ show: barAt(g.id, g.fields.length) }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Inspector -->
      <section class="panel" role="region" aria-label="Inspector">
        <header>INSPECTOR</header>
        <div class="panel__body">
          <FieldInspector v-if="selectedField" :field="selectedField" @update="onUpdateField" />
          <GroupInspector
            v-else-if="selectedGroup"
            :group="selectedGroup"
            @update="onUpdateGroup"
            @delete="onDeleteGroup"
          />
          <SchemaInspector
            v-else
            :shape="shape"
            :prefixes="doc.prefixes"
            @update-shape="onUpdateShape"
            @update-prefixes="onUpdatePrefixes"
          />
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
.bar__title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.bar__title .mono {
  font-weight: 400;
  font-size: 12px;
  color: var(--muted);
}
.btn.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent-line);
}
.ghead-sel {
  display: grid;
  place-items: center;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px;
}
.group__head.selected {
  box-shadow: inset 2px 0 0 var(--accent);
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
.drop.over {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.cardwrap {
  /* wrapper so dragover can compute an insertion index per card */
  display: block;
}
.dropbar {
  height: 3px;
  border-radius: 2px;
  background: transparent;
}
.dropbar.show {
  background: var(--accent);
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
