<script setup lang="ts">
/**
 * Form Preview (Phase 4, task 4.4): a live, fillable form generated from a
 * shape so a steward can test what curators will see. Covers the full DASH
 * widget set via `previewKind`. Values are throwaway local state (never
 * persisted). "Validate record" runs the client-side required-fields check
 * (`sh:minCount ≥ 1`) and highlights the empty required inputs.
 */
import { computed, ref, watch } from "vue";
import type { ShapeModel } from "./model";
import { isRequired, missingRequired, previewKind, type PreviewValues } from "./preview";

const props = defineProps<{ shape: ShapeModel }>();

const values = ref<PreviewValues>({});
const validated = ref(false);

const fields = computed(() => props.shape.groups.flatMap((g) => g.fields));
const missing = computed(() => (validated.value ? missingRequired(fields.value, values.value) : []));
const missingIds = computed(() => new Set(missing.value.map((f) => f.id)));

// "Either/or" groups → an "at least one required" hint listing their fields.
const orGroups = computed(() => props.shape.groups.filter((g) => g.kind === "or"));

// Reset throwaway state when a different shape is previewed.
watch(
  () => props.shape.id,
  () => {
    values.value = {};
    validated.value = false;
  },
);

function validate() {
  validated.value = true;
}
function clear() {
  values.value = {};
  validated.value = false;
}
</script>

<template>
  <div class="preview">
    <div class="bar">
      <span class="count">{{ fields.length }} field{{ fields.length === 1 ? "" : "s" }}</span>
      <div class="actions">
        <button class="btn sm" @click="validate">Validate record</button>
        <button class="btn sm ghost" @click="clear">Clear</button>
      </div>
    </div>

    <div v-if="validated" class="banner" :class="missing.length ? 'bad' : 'ok'">
      <template v-if="missing.length">
        ✕ {{ missing.length }} required field{{ missing.length === 1 ? "" : "s" }} still
        need{{ missing.length === 1 ? "s" : "" }} a value.
      </template>
      <template v-else>✓ All required fields are filled — this record would validate against the schema.</template>
    </div>

    <div v-if="orGroups.length" class="or-hints">
      <div v-for="g in orGroups" :key="g.id" class="or-hint">
        <strong>At least one required{{ g.label ? ` · ${g.label}` : "" }}:</strong>
        <span class="mono">{{ g.fields.map((f) => f.name || f.path).join("  ·  ") || "(no fields)" }}</span>
      </div>
    </div>

    <div v-for="g in shape.groups" :key="g.id" class="group">
      <h3 v-if="g.label">{{ g.label }}</h3>
      <label v-for="f in g.fields" :key="f.id" class="field" :class="{ invalid: missingIds.has(f.id) }">
        <span class="label">{{ f.name || f.path }}<span v-if="isRequired(f)" class="req"> *</span></span>

        <textarea v-if="previewKind(f) === 'textarea'" v-model="values[f.id] as string" rows="3" :aria-label="f.name || f.path" />
        <select v-else-if="previewKind(f) === 'enum'" v-model="values[f.id] as string" :aria-label="f.name || f.path">
          <option value="">—</option>
          <option v-for="opt in f.inValues ?? []" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <label v-else-if="previewKind(f) === 'boolean'" class="bool">
          <input v-model="values[f.id] as boolean" type="checkbox" :aria-label="f.name || f.path" />
          <span>{{ values[f.id] ? "true" : "false" }}</span>
        </label>
        <input v-else-if="previewKind(f) === 'date'" v-model="values[f.id] as string" type="date" :aria-label="f.name || f.path" />
        <input
          v-else-if="previewKind(f) === 'datetime'"
          v-model="values[f.id] as string"
          type="datetime-local"
          :aria-label="f.name || f.path"
        />
        <input v-else-if="previewKind(f) === 'number'" v-model="values[f.id] as string" type="number" :aria-label="f.name || f.path" />
        <input
          v-else
          v-model="values[f.id] as string"
          :type="previewKind(f) === 'iri' ? 'url' : 'text'"
          :aria-label="f.name || f.path"
        />

        <span v-if="f.description" class="help">{{ f.description }}</span>
      </label>
    </div>

    <p v-if="!fields.length" class="empty">This shape has no properties yet.</p>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.count {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.actions {
  display: flex;
  gap: 8px;
}
.banner {
  font-size: 13px;
  padding: 10px 12px;
  border-radius: var(--r-2);
}
.banner.ok {
  color: var(--ok);
  background: var(--ok-soft);
}
.banner.bad {
  color: var(--signal);
  background: var(--signal-soft);
}
.or-hints {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.or-hint {
  font-size: 12px;
  color: var(--ink-2);
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: var(--r-1);
  background: var(--surface-2);
}
.or-hint .mono {
  color: var(--muted);
}
.group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  border-bottom: 1px solid var(--line);
  padding-bottom: 6px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
}
.req {
  color: var(--signal);
}
input,
textarea,
select {
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 9px 11px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
}
.field.invalid input,
.field.invalid textarea,
.field.invalid select {
  border-color: var(--signal);
}
.bool {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bool input {
  width: auto;
}
.help {
  font-size: 11px;
  color: var(--muted);
}
.empty {
  font-size: 13px;
  color: var(--muted);
}
</style>
