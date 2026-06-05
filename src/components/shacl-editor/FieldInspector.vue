<script setup lang="ts">
/**
 * Field inspector for the form designer (Phase 4, task 4.2). Edits the SHACL
 * constraints of the selected `sh:property`. Emits an `update` patch per
 * change; the parent runs it through `mutations.updateField` and re-serialises.
 * Range controls switch on node kind: Literal → datatype, IRI → class.
 */
import { computed, ref } from "vue";
import type { Field } from "./model";
import { DATATYPES, NODE_KINDS, WIDGET_BY_ID } from "./widgets";

const props = defineProps<{ field: Field; groupLabel?: string }>();
const emit = defineEmits<{ (e: "update", patch: Partial<Field>): void }>();

const editorIri = computed(() => WIDGET_BY_ID[props.field.widgetId]?.editor ?? props.field.editor ?? "");
const isLiteral = computed(() => props.field.nodeKind === "sh:Literal" || props.field.datatype !== null);
const isIri = computed(() => props.field.nodeKind === "sh:IRI" || props.field.nodeKind === "sh:BlankNodeOrIRI");

/** Parse a number input into a number, or null when blank. */
function toNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// sh:in chip editor — Enter adds, × removes.
const inDraft = ref("");
function addChip() {
  const v = inDraft.value.trim();
  if (!v) return;
  emit("update", { inValues: [...(props.field.inValues ?? []), v] });
  inDraft.value = "";
}
function removeChip(i: number) {
  const list = (props.field.inValues ?? []).filter((_, idx) => idx !== i);
  emit("update", { inValues: list.length ? list : null });
}
</script>

<template>
  <div class="insp">
    <div class="head">
      <div class="head__name">{{ WIDGET_BY_ID[field.widgetId]?.name ?? "Field" }}</div>
      <div class="head__iri mono">{{ editorIri }}</div>
    </div>

    <section>
      <h4>Basic</h4>
      <label class="f">
        <span>Label <em>sh:name</em></span>
        <input :value="field.name" @input="emit('update', { name: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="f">
        <span>Description <em>sh:description</em></span>
        <textarea
          rows="2"
          :value="field.description"
          @input="emit('update', { description: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
      <label class="f">
        <span>Property path <em>sh:path</em></span>
        <input
          class="mono"
          :value="field.path"
          @input="emit('update', { path: ($event.target as HTMLInputElement).value })"
        />
      </label>
    </section>

    <section>
      <h4>Constraints</h4>
      <div class="row2">
        <label class="f">
          <span>Min count <em>sh:minCount</em></span>
          <input
            type="number"
            :value="field.minCount ?? ''"
            @input="emit('update', { minCount: toNum(($event.target as HTMLInputElement).value) })"
          />
        </label>
        <label class="f">
          <span>Max count <em>sh:maxCount</em></span>
          <input
            type="number"
            :value="field.maxCount ?? ''"
            @input="emit('update', { maxCount: toNum(($event.target as HTMLInputElement).value) })"
          />
        </label>
      </div>
      <label class="f">
        <span>Node kind <em>sh:nodeKind</em></span>
        <select
          :value="field.nodeKind ?? ''"
          @change="emit('update', { nodeKind: ($event.target as HTMLSelectElement).value || null })"
        >
          <option value="">(none)</option>
          <option v-for="nk in NODE_KINDS" :key="nk" :value="nk">{{ nk }}</option>
        </select>
      </label>
      <label v-if="isLiteral" class="f">
        <span>Datatype <em>sh:datatype</em></span>
        <select
          :value="field.datatype ?? ''"
          @change="emit('update', { datatype: ($event.target as HTMLSelectElement).value || null })"
        >
          <option value="">(none)</option>
          <option v-for="dt in DATATYPES" :key="dt" :value="dt">{{ dt }}</option>
        </select>
      </label>
      <label v-if="isIri" class="f">
        <span>Class <em>sh:class</em></span>
        <input
          class="mono"
          :value="field.class ?? ''"
          @input="emit('update', { class: ($event.target as HTMLInputElement).value || null })"
        />
      </label>
      <div v-if="isLiteral" class="row2">
        <label class="f">
          <span>Min length <em>sh:minLength</em></span>
          <input
            type="number"
            :value="field.minLength ?? ''"
            @input="emit('update', { minLength: toNum(($event.target as HTMLInputElement).value) })"
          />
        </label>
        <label class="f">
          <span>Max length <em>sh:maxLength</em></span>
          <input
            type="number"
            :value="field.maxLength ?? ''"
            @input="emit('update', { maxLength: toNum(($event.target as HTMLInputElement).value) })"
          />
        </label>
      </div>
      <label v-if="isLiteral" class="f">
        <span>Pattern <em>sh:pattern</em></span>
        <input
          class="mono"
          :value="field.pattern"
          placeholder="^.+$"
          @input="emit('update', { pattern: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <div class="f">
        <span>Allowed values <em>sh:in</em> — press Enter to add</span>
        <div class="chips">
          <span v-for="(v, i) in field.inValues ?? []" :key="i" class="chip">
            {{ v }}
            <button type="button" class="chip__x" :aria-label="`Remove ${v}`" @click="removeChip(i)">×</button>
          </span>
          <input
            class="chip__in"
            :value="inDraft"
            placeholder="Add value…"
            @input="inDraft = ($event.target as HTMLInputElement).value"
            @keydown.enter.prevent="addChip"
          />
        </div>
      </div>
    </section>

    <section>
      <h4>Defaults &amp; order</h4>
      <label class="f">
        <span>Default value <em>sh:defaultValue</em></span>
        <input
          :value="field.defaultValue"
          @input="emit('update', { defaultValue: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="f">
        <span>Order <em>sh:order</em></span>
        <input
          type="number"
          :value="field.order"
          @input="emit('update', { order: toNum(($event.target as HTMLInputElement).value) ?? 0 })"
        />
      </label>
      <div class="f">
        <span>Group <em>sh:group</em></span>
        <div class="readonly">
          {{ groupLabel || "(ungrouped)" }}
          <small>move by dragging the field into another group</small>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.insp {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.head {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}
.head__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.head__iri {
  font-size: 11px;
  color: var(--accent);
}
section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
h4 {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-2);
}
.f {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.f span {
  font-size: 11px;
  color: var(--muted);
}
.f em {
  font-style: normal;
  font-family: var(--font-mono);
  color: var(--muted-2);
}
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
input,
textarea,
select {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 7px 9px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
}
.mono {
  font-family: var(--font-mono);
}
.readonly {
  font-size: 13px;
  color: var(--ink);
  padding: 7px 9px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-2);
  background: var(--surface-2);
}
.readonly small {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  padding: 6px;
  background: var(--paper);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--r-1);
  padding: 2px 4px 2px 8px;
}
.chip__x {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
}
.chip__in {
  flex: 1;
  min-width: 80px;
  border: none;
  padding: 2px 4px;
  background: none;
}
</style>
