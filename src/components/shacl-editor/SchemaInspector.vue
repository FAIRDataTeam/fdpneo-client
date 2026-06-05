<script setup lang="ts">
/**
 * Schema inspector (Phase 4, task 4.2): the default inspector context. Edits
 * the shape's identity (`rdfs:label`/`rdfs:comment`), shape definition
 * (shape IRI, `sh:targetClass`), and the document's `@prefix` table.
 */
import type { PrefixDecl } from "@/rdf/namespaces";
import type { ShapeModel } from "./model";

const props = defineProps<{ shape: ShapeModel; prefixes: PrefixDecl[] }>();
const emit = defineEmits<{
  (e: "update-shape", patch: Partial<ShapeModel>): void;
  (e: "update-prefixes", list: PrefixDecl[]): void;
}>();

function setPrefix(i: number, key: "prefix" | "uri", val: string) {
  emit(
    "update-prefixes",
    props.prefixes.map((p, idx) => (idx === i ? { ...p, [key]: val } : p)),
  );
}
function addRow() {
  emit("update-prefixes", [...props.prefixes, { prefix: "", uri: "" }]);
}
function removeRow(i: number) {
  emit(
    "update-prefixes",
    props.prefixes.filter((_, idx) => idx !== i),
  );
}
</script>

<template>
  <div class="insp">
    <div class="head"><div class="head__name">Schema settings</div></div>

    <section>
      <h4>Identity</h4>
      <label class="f">
        <span>Schema name <em>rdfs:label</em></span>
        <input :value="shape.label" @input="emit('update-shape', { label: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="f">
        <span>Description <em>rdfs:comment</em></span>
        <textarea
          rows="2"
          :value="shape.comment"
          @input="emit('update-shape', { comment: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
    </section>

    <section>
      <h4>Shape definition</h4>
      <label class="f">
        <span>Shape IRI</span>
        <input
          class="mono"
          :value="shape.shapeIri"
          @input="emit('update-shape', { shapeIri: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="f">
        <span>Target class <em>sh:targetClass</em></span>
        <input
          class="mono"
          :value="shape.targetClass"
          @input="emit('update-shape', { targetClass: ($event.target as HTMLInputElement).value })"
        />
      </label>
    </section>

    <section>
      <h4>Vocabularies <em>@prefix</em></h4>
      <div v-for="(p, i) in prefixes" :key="i" class="prow">
        <input
          class="mono pfx"
          :value="p.prefix"
          placeholder="prefix"
          aria-label="Prefix"
          @input="setPrefix(i, 'prefix', ($event.target as HTMLInputElement).value)"
        />
        <input
          class="mono uri"
          :value="p.uri"
          placeholder="http://…"
          aria-label="Namespace URI"
          @input="setPrefix(i, 'uri', ($event.target as HTMLInputElement).value)"
        />
        <button class="x" :aria-label="`Remove ${p.prefix}`" @click="removeRow(i)">×</button>
      </div>
      <button class="add" @click="addRow">+ Add prefix</button>
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
h4 em {
  font-style: normal;
  font-family: var(--font-mono);
  text-transform: none;
  letter-spacing: 0;
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
input,
textarea {
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
.prow {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 6px;
  align-items: center;
}
.x {
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 16px;
}
.x:hover {
  color: var(--signal);
}
.add {
  align-self: flex-start;
  font-size: 12px;
  color: var(--accent);
  background: none;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  padding: 5px 10px;
  cursor: pointer;
}
</style>
