<script setup lang="ts">
/**
 * Structured editor for the `search.filters` setting — a list of facet
 * dimensions shown on the search page. Mirrors the server `SearchFilters`
 * shape: `{ filters: [{ name, label, predicate, type_filter }] }`.
 *
 * Edits a local copy and writes the whole value back through `v-model` on every
 * change, so the parent (`SettingEditor`) saves the same JSON the textarea would.
 */
import { reactive, watch } from "vue";
import type { SettingValue } from "@/api/settings";
import AppIcon from "@/components/shared/AppIcon.vue";

interface SearchFilterRow {
  /** Stable per-row id for the v-for key — never emitted (the watch maps to a
   * clean shape). Keying by array index would bind focus/inputs to the wrong
   * row after a mid-list remove. */
  _id: string;
  name: string;
  label: string;
  predicate: string;
  type_filter: string | null;
}

let rowUid = 0;
const nextRowId = (): string => `row-${rowUid++}`;

// The setting value is an open object at the API boundary; we read/write the
// concrete `{ filters: [...] }` shape with runtime guards.
const model = defineModel<SettingValue>({ required: true });
defineProps<{ canEdit: boolean }>();

const str = (v: unknown): string => (typeof v === "string" ? v : "");

const initial: unknown[] = Array.isArray(model.value.filters) ? model.value.filters : [];
const rows = reactive<SearchFilterRow[]>(
  initial.map((raw) => {
    const f = (raw ?? {}) as Record<string, unknown>;
    return {
      _id: nextRowId(),
      name: str(f.name),
      label: str(f.label),
      predicate: str(f.predicate),
      type_filter: str(f.type_filter) || null,
    };
  }),
);

watch(
  rows,
  () => {
    model.value = {
      filters: rows.map((r) => ({
        name: r.name,
        label: r.label,
        predicate: r.predicate,
        type_filter: r.type_filter && r.type_filter.trim() ? r.type_filter.trim() : null,
      })),
    };
  },
  { deep: true },
);

function add() {
  rows.push({ _id: nextRowId(), name: "", label: "", predicate: "", type_filter: null });
}
function remove(i: number) {
  rows.splice(i, 1);
}
</script>

<template>
  <div class="filters">
    <p v-if="!rows.length" class="empty">No facets configured. Add one to expose it on the search page.</p>

    <div v-for="(row, i) in rows" :key="row._id" class="row">
      <label class="field">
        <span class="lbl">Name</span>
        <input v-model="row.name" :disabled="!canEdit" placeholder="theme" />
      </label>
      <label class="field">
        <span class="lbl">Label</span>
        <input v-model="row.label" :disabled="!canEdit" placeholder="Theme" />
      </label>
      <label class="field grow">
        <span class="lbl">Predicate (IRI)</span>
        <input
          v-model="row.predicate"
          :disabled="!canEdit"
          class="mono"
          placeholder="http://www.w3.org/ns/dcat#theme"
        />
      </label>
      <label class="field">
        <span class="lbl">Type filter <span class="opt">(optional)</span></span>
        <input
          v-model="row.type_filter"
          :disabled="!canEdit"
          class="mono"
          placeholder="dcat:Dataset"
        />
      </label>
      <button
        v-if="canEdit"
        type="button"
        class="btn ghost sm remove"
        aria-label="Remove facet"
        @click="remove(i)"
      >
        <AppIcon name="x" :size="12" />
      </button>
    </div>

    <button v-if="canEdit" type="button" class="btn sm add" @click="add">
      <AppIcon name="plus" :size="12" /> Add facet
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.empty {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
.row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--paper);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}
.field.grow {
  flex: 1;
  min-width: 220px;
}
.lbl {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.opt {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
input {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 7px 9px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-1);
  background: var(--surface);
  color: var(--ink);
}
input.mono {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
}
.remove {
  margin-bottom: 1px;
}
.add {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
