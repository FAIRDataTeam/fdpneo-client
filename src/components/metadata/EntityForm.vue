<script setup lang="ts">
/**
 * Generic metadata entity form, driven by an `EntitySpec`'s field list.
 * Renders text / textarea / IRI / keyword inputs and binds them to a flat
 * model. A config-driven stand-in for SHACL-rendered forms (TASKS 7.5).
 */
import { computed } from "vue";
import type { EntityModel, EntitySpec } from "@/api/entityForms";
import { parseKeywords } from "@/api/entityForms";

const props = defineProps<{ spec: EntitySpec }>();
const model = defineModel<EntityModel>({ required: true });

function asText(key: string): string {
  const v = model.value[key];
  return typeof v === "string" ? v : "";
}

function keywordsText(): string {
  const v = model.value.keywords;
  return Array.isArray(v) ? v.join(", ") : "";
}

const fields = computed(() => props.spec.fields);
</script>

<template>
  <div class="form">
    <label v-for="f in fields" :key="f.key" class="field">
      <span class="label">
        {{ f.label }}<span v-if="f.required" class="req"> *</span>
      </span>

      <textarea
        v-if="f.kind === 'textarea'"
        :value="asText(f.key)"
        rows="4"
        :aria-label="f.label"
        @input="model[f.key] = ($event.target as HTMLTextAreaElement).value"
      />

      <input
        v-else-if="f.kind === 'keywords'"
        type="text"
        :value="keywordsText()"
        :placeholder="f.placeholder"
        :aria-label="f.label"
        @input="model.keywords = parseKeywords(($event.target as HTMLInputElement).value)"
      />

      <input
        v-else
        :type="f.kind === 'iri' ? 'url' : 'text'"
        :value="asText(f.key)"
        :required="f.required"
        :placeholder="f.placeholder"
        :aria-label="f.label"
        @input="model[f.key] = ($event.target as HTMLInputElement).value"
      />

      <span v-if="f.help" class="help">{{ f.help }}</span>
    </label>
  </div>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.req {
  color: var(--signal);
}
input,
textarea {
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
}
textarea {
  resize: vertical;
}
.help {
  font-size: 11px;
  color: var(--muted);
}
</style>
