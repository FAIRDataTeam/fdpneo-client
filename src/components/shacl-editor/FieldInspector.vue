<script setup lang="ts">
/**
 * Field inspector for the form designer (Phase 4, task 4.2). Edits the SHACL
 * constraints of the selected `sh:property`. Emits an `update` patch per
 * change; the parent runs it through `mutations.updateField` and re-serialises.
 * Range controls switch on node kind: Literal → datatype, IRI → class.
 */
import { computed } from "vue";
import type { Field } from "./model";
import { DATATYPES, NODE_KINDS, WIDGET_BY_ID } from "./widgets";

const props = defineProps<{ field: Field }>();
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

const inText = computed(() => (props.field.inValues ?? []).join(", "));
function onIn(v: string) {
  const list = v.split(",").map((s) => s.trim()).filter(Boolean);
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
      <label class="f">
        <span>Allowed values <em>sh:in</em> — comma-separated</span>
        <input :value="inText" @input="onIn(($event.target as HTMLInputElement).value)" />
      </label>
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
</style>
