<script setup lang="ts">
import { computed } from 'vue';
import { newId } from '../data';
import { fieldFromWidget } from '../composables/useSchema';
import { useDrag } from '../composables/useDrag';
import { useI18n } from '../composables/useI18n';
import type { Field, Group, Mutator, Schema, SelectedKind } from '../types';
import Icon from './Icon.vue';
import FieldCard from './FieldCard.vue';

// Mint a stable, unique IRI for a new group (kept fixed across later renames).
function mintGroupIri(groups: Group[], label: string): string {
  const base = `:${(label || 'group').replace(/[^A-Za-z0-9]+/g, '') || 'Group'}Group`;
  let iri = base;
  let n = 2;
  while (groups.some((g) => g.iri === iri)) iri = `${base}_${n++}`;
  return iri;
}

const { t, plural } = useI18n();

interface Props {
  schema: Schema;
  selectedKind: SelectedKind;
  selectedId: string | null;
  selectedNestedShapeId: string | null;
  mutate: (m: Mutator) => void;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  selectField: [id: string | null];
  selectGroup: [id: string];
  selectSchema: [];
  selectNestedShape: [id: string];
  selectNestedField: [nsId: string, fieldId: string];
}>();

const { state: dragState, startFieldDrag, startNestedFieldDrag, endDrag, setHover, isOurDrag } = useDrag();

const totalFields = computed(() =>
  props.schema.groups.reduce((s, g) => s + g.fields.length, 0),
);

const orderedGroups = computed(() =>
  props.schema.groups.slice().sort((a, b) => a.order - b.order),
);

// ── Main shape drag/drop ───────────────────────────────────────────────────

function onDragOverField(e: DragEvent, groupId: string, fieldId: string) {
  if (!isOurDrag(e)) return;
  e.preventDefault();
  e.stopPropagation();
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  if (e.dataTransfer) e.dataTransfer.dropEffect = dragState.payload?.type === 'field' ? 'move' : 'copy';
  setHover({ groupId, fieldId, position });
}

function onDragOverGroup(e: DragEvent, groupId: string) {
  if (!isOurDrag(e)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = dragState.payload?.type === 'field' ? 'move' : 'copy';
  setHover({ groupId, fieldId: null, position: 'end' });
}

function onDrop(e: DragEvent, targetGroupId: string) {
  e.preventDefault();
  e.stopPropagation();
  const target = dragState.hover;
  const dr = dragState.payload;
  if (!dr) { endDrag(); return; }
  if (dr.type === 'field' && dr.fromNestedShape) { endDrag(); return; } // no cross-container

  let newFieldId: string | null = null;

  props.mutate((draft) => {
    let movedField: ReturnType<typeof fieldFromWidget> | null = null;
    if (dr.type === 'field') {
      for (const g of draft.groups) {
        const idx = g.fields.findIndex((f) => f.id === dr.fieldId);
        if (idx >= 0) { movedField = g.fields.splice(idx, 1)[0]!; break; }
      }
    } else {
      movedField = fieldFromWidget(dr.widget, 0);
    }
    if (!movedField) return;

    const destGroupId = (target && target.groupId) || targetGroupId;
    let destGroup = draft.groups.find((g) => g.id === destGroupId) || draft.groups[draft.groups.length - 1];
    // No group yet (blank canvas): create the first one automatically.
    if (!destGroup) {
      const label = `Section ${draft.groups.length + 1}`;
      destGroup = { id: newId('g'), iri: mintGroupIri(draft.groups, label), label, order: draft.groups.length, fields: [] };
      draft.groups.push(destGroup);
    }

    if (target && target.fieldId) {
      const idx = destGroup.fields.findIndex((f) => f.id === target.fieldId);
      destGroup.fields.splice(target.position === 'after' ? idx + 1 : idx, 0, movedField);
    } else {
      destGroup.fields.push(movedField);
    }
    destGroup.fields.forEach((f, i) => { f.order = i; });
    newFieldId = movedField.id;
  });

  if (dr.type === 'palette' && newFieldId) emit('selectField', newFieldId);
  else if (dr.type === 'field') emit('selectField', dr.fieldId);
  endDrag();
}

// Allow dropping a widget onto the blank canvas (before any group exists).
function onDragOverEmpty(e: DragEvent) {
  if (!isOurDrag(e)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}

// ── Nested shape drag/drop ─────────────────────────────────────────────────

function onDragOverNestedField(e: DragEvent, nsId: string, fieldId: string) {
  if (!isOurDrag(e)) return;
  e.preventDefault();
  e.stopPropagation();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  if (e.dataTransfer) e.dataTransfer.dropEffect = dragState.payload?.type === 'field' ? 'move' : 'copy';
  setHover({ groupId: nsId, fieldId, position, isNested: true });
}

function onDragOverNestedShape(e: DragEvent, nsId: string) {
  if (!isOurDrag(e)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = dragState.payload?.type === 'field' ? 'move' : 'copy';
  setHover({ groupId: nsId, fieldId: null, position: 'end', isNested: true });
}

function onDropToNested(e: DragEvent, nsId: string) {
  e.preventDefault();
  e.stopPropagation();
  const target = dragState.hover;
  const dr = dragState.payload;
  if (!dr) { endDrag(); return; }

  // Only accept palette drops or reorders within the same nested shape
  if (dr.type === 'field' && dr.fromNestedShape !== nsId) { endDrag(); return; }

  let newFieldId: string | null = null;

  props.mutate((draft) => {
    const ns = (draft.nestedShapes || []).find((x) => x.id === nsId);
    if (!ns) return;

    let movedField: Field | null = null;
    if (dr.type === 'field') {
      const idx = ns.fields.findIndex((f) => f.id === dr.fieldId);
      if (idx >= 0) movedField = ns.fields.splice(idx, 1)[0]!;
    } else {
      movedField = fieldFromWidget(dr.widget, 0);
    }
    if (!movedField) return;

    if (target?.isNested && target.groupId === nsId && target.fieldId) {
      const idx = ns.fields.findIndex((f) => f.id === target.fieldId);
      ns.fields.splice(target.position === 'after' ? idx + 1 : idx, 0, movedField);
    } else {
      ns.fields.push(movedField);
    }
    ns.fields.forEach((f, i) => { f.order = i; });
    newFieldId = movedField.id;
  });

  if (dr.type === 'palette' && newFieldId) emit('selectNestedField', nsId, newFieldId);
  else if (dr.type === 'field') emit('selectNestedField', nsId, dr.fieldId);
  endDrag();
}

// ── Main shape CRUD ────────────────────────────────────────────────────────

function addGroup() {
  props.mutate((draft) => {
    const order = draft.groups.length;
    const label = `Section ${order + 1}`;
    draft.groups.push({ id: newId('g'), iri: mintGroupIri(draft.groups, label), label, order, fields: [] });
  });
}

// ── U7-lite: reorder a group up/down ────────────────────────────────────────
function moveGroup(gid: string, dir: -1 | 1) {
  props.mutate((draft) => {
    const sorted = draft.groups.slice().sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((g) => g.id === gid);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sorted.length) return;
    [sorted[idx], sorted[swap]] = [sorted[swap]!, sorted[idx]!];
    sorted.forEach((g, i) => { g.order = i; });
  });
}

function renameGroup(gid: string, label: string) {
  props.mutate((draft) => {
    const g = draft.groups.find((x) => x.id === gid);
    if (g) g.label = label;
  });
}

function deleteGroup(gid: string) {
  props.mutate((draft) => {
    const idx = draft.groups.findIndex((x) => x.id === gid);
    if (idx >= 0) draft.groups.splice(idx, 1);
    draft.groups.forEach((g, i) => { g.order = i; });
  });
}

function deleteField(gid: string, fid: string) {
  props.mutate((draft) => {
    const g = draft.groups.find((x) => x.id === gid);
    if (!g) return;
    g.fields = g.fields.filter((f) => f.id !== fid);
    g.fields.forEach((f, i) => { f.order = i; });
  });
}

function duplicateField(gid: string, fid: string) {
  props.mutate((draft) => {
    const g = draft.groups.find((x) => x.id === gid);
    if (!g) return;
    const i = g.fields.findIndex((f) => f.id === fid);
    if (i < 0) return;
    const copy: Field = { ...JSON.parse(JSON.stringify(g.fields[i])), id: newId('f'), name: g.fields[i]!.name + ' (copy)' };
    g.fields.splice(i + 1, 0, copy);
    g.fields.forEach((f, k) => { f.order = k; });
  });
}

// ── Nested shape CRUD ──────────────────────────────────────────────────────

function addNestedShape() {
  let newNsId = '';
  props.mutate((draft) => {
    if (!draft.nestedShapes) draft.nestedShapes = [];
    const count = draft.nestedShapes.length + 1;
    newNsId = newId('ns');
    draft.nestedShapes.push({ id: newNsId, iri: `:NestedShape${count}`, targetClass: '', fields: [] });
  });
  if (newNsId) emit('selectNestedShape', newNsId);
}

function deleteNestedShape(nsId: string) {
  props.mutate((draft) => {
    const idx = (draft.nestedShapes || []).findIndex((x) => x.id === nsId);
    if (idx >= 0) draft.nestedShapes.splice(idx, 1);
  });
  emit('selectSchema');
}

function deleteNestedField(nsId: string, fid: string) {
  props.mutate((draft) => {
    const ns = (draft.nestedShapes || []).find((x) => x.id === nsId);
    if (!ns) return;
    ns.fields = ns.fields.filter((f) => f.id !== fid);
    ns.fields.forEach((f, i) => { f.order = i; });
  });
}

function duplicateNestedField(nsId: string, fid: string) {
  props.mutate((draft) => {
    const ns = (draft.nestedShapes || []).find((x) => x.id === nsId);
    if (!ns) return;
    const i = ns.fields.findIndex((f) => f.id === fid);
    if (i < 0) return;
    const copy: Field = { ...JSON.parse(JSON.stringify(ns.fields[i])), id: newId('f'), name: ns.fields[i]!.name + ' (copy)' };
    ns.fields.splice(i + 1, 0, copy);
    ns.fields.forEach((f, k) => { f.order = k; });
  });
}

// ── Drop indicators ────────────────────────────────────────────────────────

function isFieldDragging(id: string): boolean {
  return dragState.payload?.type === 'field' && dragState.payload.fieldId === id && !dragState.payload.fromNestedShape;
}

function isNestedFieldDragging(nsId: string, fid: string): boolean {
  return dragState.payload?.type === 'field' && dragState.payload.fieldId === fid && dragState.payload.fromNestedShape === nsId;
}

function showBefore(gid: string, fid: string): boolean {
  const h = dragState.hover;
  return !!h && !h.isNested && h.groupId === gid && h.fieldId === fid && h.position === 'before';
}

function showAfter(gid: string, fid: string): boolean {
  const h = dragState.hover;
  return !!h && !h.isNested && h.groupId === gid && h.fieldId === fid && h.position === 'after';
}

function showEnd(gid: string, fieldsLen: number): boolean {
  const h = dragState.hover;
  return !!h && !h.isNested && h.groupId === gid && h.fieldId === null && fieldsLen > 0;
}

function showNestedBefore(nsId: string, fid: string): boolean {
  const h = dragState.hover;
  return !!h && !!h.isNested && h.groupId === nsId && h.fieldId === fid && h.position === 'before';
}

function showNestedAfter(nsId: string, fid: string): boolean {
  const h = dragState.hover;
  return !!h && !!h.isNested && h.groupId === nsId && h.fieldId === fid && h.position === 'after';
}

function showNestedEnd(nsId: string, fieldsLen: number): boolean {
  const h = dragState.hover;
  return !!h && !!h.isNested && h.groupId === nsId && h.fieldId === null && fieldsLen > 0;
}

function onCanvasClick() {
  emit('selectField', null);
}
</script>

<template>
  <div class="panel canvas">
    <div class="panel__header">
      <div>
        <div class="panel__title">{{ t('canvas.formCanvas') }}</div>
        <div class="panel__subtitle">
          {{ plural('count.properties', totalFields) }}
          {{ t('canvas.in') }} {{ plural('count.groups', schema.groups.length) }}
          <template v-if="(schema.nestedShapes || []).length">
            · {{ plural('count.nestedShapes', schema.nestedShapes.length) }}
          </template>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" @click="addGroup">
        <Icon name="plus" :size="13" /> {{ t('canvas.addGroup') }}
      </button>
    </div>
    <div class="panel__body panel__body--snug">
      <div class="canvas__inner" @click="onCanvasClick">

        <!-- Schema banner -->
        <div
          class="target-banner"
          :class="{ 'is-selected': selectedKind === 'schema' }"
          @click.stop="emit('selectSchema')"
        >
          <div class="target-banner__main">
            <div class="target-banner__icon"><Icon name="layers" :size="18" /></div>
            <div style="min-width: 0">
              <div class="target-banner__name">{{ schema.schemaName || t('canvas.untitledSchema') }}</div>
              <div class="target-banner__sub">sh:NodeShape · sh:targetClass {{ schema.targetClass || '?' }}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" @click.stop="emit('selectSchema')">
            <Icon name="gear" :size="13" /> {{ t('canvas.schemaSettings') }}
          </button>
        </div>

        <div
          v-if="schema.groups.length === 0 && totalFields === 0"
          class="canvas-empty"
          @dragover="onDragOverEmpty($event)"
          @drop="onDrop($event, '')"
        >
          <div class="canvas-empty__icon"><Icon name="wand" :size="36" /></div>
          <div class="canvas-empty__title">{{ t('canvas.emptyTitle') }}</div>
          <div class="canvas-empty__sub">{{ t('canvas.emptySub') }}</div>
        </div>

        <!-- Main shape groups -->
        <div v-for="(g, gi) in orderedGroups" :key="g.id" class="group-card">
          <div class="group-card__header" @click.stop="emit('selectGroup', g.id)">
            <Icon name="layers" :size="14" />
            <input
              class="group-card__title"
              :value="g.label"
              @input="renameGroup(g.id, ($event.target as HTMLInputElement).value)"
              @click.stop
            />
            <div class="group-card__actions">
              <button class="btn btn-ghost btn-xs" :title="t('canvas.moveUp')" :disabled="gi === 0" @click.stop="moveGroup(g.id, -1)">↑</button>
              <button class="btn btn-ghost btn-xs" :title="t('canvas.moveDown')" :disabled="gi === orderedGroups.length - 1" @click.stop="moveGroup(g.id, 1)">↓</button>
              <button class="btn btn-danger-ghost btn-xs" :title="t('canvas.deleteGroupTitle')" @click.stop="deleteGroup(g.id)">
                <Icon name="trash" :size="13" />
              </button>
            </div>
          </div>
          <div class="group-card__body" @dragover="onDragOverGroup($event, g.id)" @drop="onDrop($event, g.id)">
            <div v-if="g.fields.length === 0" class="group-card__drop-here">{{ t('canvas.dropWidgetHere') }}</div>
            <template v-for="f in g.fields" :key="f.id">
              <div v-if="showBefore(g.id, f.id)" class="drop-indicator" />
              <div @dragover="onDragOverField($event, g.id, f.id)" @drop="onDrop($event, g.id)">
                <FieldCard
                  :field="f"
                  :is-selected="selectedKind === 'field' && selectedId === f.id"
                  :is-dragging="isFieldDragging(f.id)"
                  @select="emit('selectField', f.id)"
                  @delete="deleteField(g.id, f.id)"
                  @duplicate="duplicateField(g.id, f.id)"
                  @dragstart="(e) => startFieldDrag(e, f.id, g.id)"
                  @dragend="endDrag"
                />
              </div>
              <div v-if="showAfter(g.id, f.id)" class="drop-indicator" />
            </template>
            <div v-if="showEnd(g.id, g.fields.length)" class="drop-indicator" />
          </div>
        </div>

        <div class="canvas-add-group">
          <button class="btn btn-ghost btn-sm" @click="addGroup">
            <Icon name="plus" :size="13" /> {{ t('canvas.addAnotherGroup') }}
          </button>
        </div>

        <!-- Nested shapes section -->
        <div v-if="(schema.nestedShapes || []).length > 0" class="nested-shapes-divider">
          <span>{{ t('canvas.nestedShapes') }}</span>
        </div>

        <div
          v-for="ns in (schema.nestedShapes || [])"
          :key="ns.id"
          class="nested-shape-card"
        >
          <div
            class="nested-shape-card__header"
            :class="{ 'is-selected': selectedKind === 'nested-shape' && selectedNestedShapeId === ns.id }"
            @click.stop="emit('selectNestedShape', ns.id)"
          >
            <Icon name="document" :size="14" />
            <div style="flex: 1; min-width: 0">
              <div class="nested-shape-card__iri">{{ ns.iri }}</div>
              <div v-if="ns.targetClass" class="nested-shape-card__class">{{ ns.targetClass }}</div>
            </div>
            <button
              class="btn btn-danger-ghost btn-xs"
              :title="t('canvas.deleteNestedShapeTitle')"
              @click.stop="deleteNestedShape(ns.id)"
            >
              <Icon name="trash" :size="13" />
            </button>
          </div>
          <div
            class="group-card__body"
            @dragover="onDragOverNestedShape($event, ns.id)"
            @drop="onDropToNested($event, ns.id)"
          >
            <div v-if="ns.fields.length === 0" class="group-card__drop-here">{{ t('canvas.dropWidgetHere') }}</div>
            <template v-for="f in [...ns.fields].sort((a, b) => a.order - b.order)" :key="f.id">
              <div v-if="showNestedBefore(ns.id, f.id)" class="drop-indicator" />
              <div @dragover="onDragOverNestedField($event, ns.id, f.id)" @drop="onDropToNested($event, ns.id)">
                <FieldCard
                  :field="f"
                  :is-selected="selectedKind === 'nested-field' && selectedId === f.id && selectedNestedShapeId === ns.id"
                  :is-dragging="isNestedFieldDragging(ns.id, f.id)"
                  @select="emit('selectNestedField', ns.id, f.id)"
                  @delete="deleteNestedField(ns.id, f.id)"
                  @duplicate="duplicateNestedField(ns.id, f.id)"
                  @dragstart="(e) => startNestedFieldDrag(e, f.id, ns.id)"
                  @dragend="endDrag"
                />
              </div>
              <div v-if="showNestedAfter(ns.id, f.id)" class="drop-indicator" />
            </template>
            <div v-if="showNestedEnd(ns.id, ns.fields.length)" class="drop-indicator" />
          </div>
        </div>

        <div class="canvas-add-group">
          <button class="btn btn-ghost btn-sm" @click="addNestedShape">
            <Icon name="plus" :size="13" /> {{ t('canvas.addNestedShape') }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
