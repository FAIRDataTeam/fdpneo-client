<script setup lang="ts">
/**
 * Generic metadata entity form, driven by an `EntitySpec`'s field list.
 * Renders text / textarea / IRI / keyword inputs and binds them to a flat
 * model. A config-driven stand-in for SHACL-rendered forms (TASKS 7.5).
 */
import { computed } from "vue";
import type { EntityModel, EntitySpec } from "@/api/entityForms";
import { constraintHint, detailKey, langKey } from "@/api/entityForms";
import { orderedLanguages, type LanguageOption } from "@/api/languages";
import { useLocaleStore } from "@/stores/locale";

// Active UI language first, then English, then the rest (note #26).
const locale = useLocaleStore();
const languages = orderedLanguages(locale.rdfLang);
function langOptions(current: string): LanguageOption[] {
  if (current && !languages.some((l) => l.code === current)) {
    return [{ code: current, name: current }, ...languages];
  }
  return languages;
}
import { usePublishedPolicies } from "@/composables/usePolicies";
import { usePublishedLicenses } from "@/composables/useLicenses";
import AutocompleteInput from "./AutocompleteInput.vue";
import ReferencePicker from "./ReferencePicker.vue";
import RepeatableInput from "./RepeatableInput.vue";

const props = defineProps<{ spec: EntitySpec }>();
const model = defineModel<EntityModel>({ required: true });

// Managed-document catalogs for `kind: "ref"` pickers (dct:rights / dct:license).
// Only PUBLISHED docs are offered for assignment (ADR-0012 §4).
const { policies } = usePublishedPolicies();
const { licenses } = usePublishedLicenses();
function refOptions(source?: string): { iri: string; label: string }[] {
  const list = source === "licenses" ? licenses.value : policies.value;
  return list.map((d) => ({ iri: d.iri, label: d.title || d.id }));
}

function asText(key: string): string {
  const v = model.value[key];
  return typeof v === "string" ? v : "";
}

function asArray(key: string): string[] {
  const v = model.value[key];
  return Array.isArray(v) ? v : [];
}

// <input type="datetime-local"> yields minute precision ("…T10:30"); pad to
// seconds so the value is a valid xsd:dateTime.
function setDateTime(key: string, v: string) {
  model.value[key] = v && v.length === 16 ? `${v}:00` : v;
}

const fields = computed(() => props.spec.fields);

// Show per-field origin tags only when the type's schema actually composes more
// than one source shape (≥2 distinct origins) — otherwise they'd be noise.
const showOrigins = computed(() => {
  const origins = new Set(fields.value.map((f) => f.origin).filter(Boolean));
  return origins.size >= 2;
});

// "At least one of" requirements from the shape's sh:or (rendered as a hint).
const orGroups = computed(() => props.spec.orGroups ?? []);
function orLabels(keys: string[]): string {
  return keys.map((k) => fields.value.find((f) => f.key === k)?.label ?? k).join(" or ");
}
</script>

<template>
  <div class="form">
    <label v-for="f in fields" :key="f.key" class="field">
      <span v-if="f.kind !== 'details'" class="label">
        {{ f.label }}<span v-if="f.required" class="req"> *</span>
        <span v-if="showOrigins && f.origin" class="origin" :title="`Inherited from ${f.origin}`">{{
          f.origin
        }}</span>
      </span>

      <!-- DASH reference editor: pick an IRI from a class lookup. -->
      <ReferencePicker
        v-if="f.refWidget && f.refClass"
        :class-iri="f.refClass"
        :widget="f.refWidget"
        :model-value="asText(f.key)"
        :required="!!f.required"
        :label="f.label"
        @update:model-value="model[f.key] = $event"
      />

      <!-- Language-tagged literal: value + a BCP47 language tag. -->
      <div v-else-if="f.lang" class="lang-row">
        <textarea
          v-if="f.kind === 'textarea'"
          :value="asText(f.key)"
          rows="4"
          :aria-label="f.label"
          @input="model[f.key] = ($event.target as HTMLTextAreaElement).value"
        />
        <input
          v-else
          type="text"
          :value="asText(f.key)"
          :aria-label="f.label"
          @input="model[f.key] = ($event.target as HTMLInputElement).value"
        />
        <select
          class="lang-tag"
          :value="asText(langKey(f.key))"
          :aria-label="`${f.label} language`"
          @change="model[langKey(f.key)] = ($event.target as HTMLSelectElement).value"
        >
          <option value="">—</option>
          <option v-for="l in langOptions(asText(langKey(f.key)))" :key="l.code" :value="l.code">
            {{ l.code }} — {{ l.name }}
          </option>
        </select>
      </div>

      <textarea
        v-else-if="f.kind === 'textarea'"
        :value="asText(f.key)"
        rows="4"
        :aria-label="f.label"
        @input="model[f.key] = ($event.target as HTMLTextAreaElement).value"
      />

      <RepeatableInput
        v-else-if="f.kind === 'keywords' || f.kind === 'iris'"
        :type="f.kind === 'iris' ? 'url' : 'text'"
        :model-value="asArray(f.key)"
        :label="f.label"
        :placeholder="f.placeholder ?? (f.kind === 'iris' ? 'an IRI' : 'a value')"
        :min-count="f.minCount"
        :max-count="f.maxCount"
        @update:model-value="model[f.key] = $event"
      />

      <AutocompleteInput
        v-else-if="f.autocomplete && (f.kind === 'iri' || f.kind === 'text')"
        :source="f.autocomplete"
        :type="f.kind === 'iri' ? 'url' : 'text'"
        :required="!!f.required"
        :placeholder="f.placeholder ?? ''"
        :field-label="f.label"
        :model-value="asText(f.key)"
        @update:model-value="model[f.key] = $event"
      />

      <template v-else-if="f.kind === 'ref'">
        <input
          :list="`ref-${f.key}`"
          type="url"
          :value="asText(f.key)"
          :placeholder="f.placeholder ?? 'select or paste an IRI'"
          :aria-label="f.label"
          @input="model[f.key] = ($event.target as HTMLInputElement).value"
        />
        <datalist :id="`ref-${f.key}`">
          <option v-for="o in refOptions(f.source)" :key="o.iri" :value="o.iri">{{ o.label }}</option>
        </datalist>
      </template>

      <select
        v-else-if="f.kind === 'enum'"
        :value="asText(f.key)"
        :required="!!f.required"
        :aria-label="f.label"
        @change="model[f.key] = ($event.target as HTMLSelectElement).value"
      >
        <option value="">—</option>
        <option v-for="o in f.options ?? []" :key="o" :value="o">{{ o }}</option>
      </select>

      <select
        v-else-if="f.kind === 'boolean'"
        :value="asText(f.key)"
        :aria-label="f.label"
        @change="model[f.key] = ($event.target as HTMLSelectElement).value"
      >
        <option value="">—</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>

      <input
        v-else-if="f.kind === 'date'"
        type="date"
        :value="asText(f.key)"
        :required="!!f.required"
        :aria-label="f.label"
        @input="model[f.key] = ($event.target as HTMLInputElement).value"
      />

      <input
        v-else-if="f.kind === 'datetime'"
        type="datetime-local"
        :value="asText(f.key).slice(0, 16)"
        :required="!!f.required"
        :aria-label="f.label"
        @input="setDateTime(f.key, ($event.target as HTMLInputElement).value)"
      />

      <input
        v-else-if="f.kind === 'number'"
        type="number"
        :value="asText(f.key)"
        :required="!!f.required"
        :placeholder="f.placeholder"
        :aria-label="f.label"
        @input="model[f.key] = ($event.target as HTMLInputElement).value"
      />

      <fieldset v-else-if="f.kind === 'details'" class="details">
        <legend>{{ f.label }}</legend>
        <label v-for="nf in f.nested ?? []" :key="nf.key" class="field">
          <span class="label">{{ nf.label }}<span v-if="nf.required" class="req"> *</span></span>
          <textarea
            v-if="nf.kind === 'textarea'"
            :value="asText(detailKey(f.key, nf.key))"
            rows="3"
            :aria-label="nf.label"
            @input="model[detailKey(f.key, nf.key)] = ($event.target as HTMLTextAreaElement).value"
          />
          <input
            v-else
            :type="nf.kind === 'iri' ? 'url' : nf.kind === 'number' ? 'number' : nf.kind === 'date' ? 'date' : nf.kind === 'datetime' ? 'datetime-local' : 'text'"
            :value="asText(detailKey(f.key, nf.key))"
            :aria-label="nf.label"
            @input="model[detailKey(f.key, nf.key)] = ($event.target as HTMLInputElement).value"
          />
        </label>
      </fieldset>

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
      <span v-if="constraintHint(f)" class="help mono">{{ constraintHint(f) }}</span>
    </label>

    <p v-for="(g, i) in orGroups" :key="`or-${i}`" class="or-req">
      At least one required: <strong>{{ orLabels(g.keys) }}</strong>
    </p>
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
.origin {
  margin-left: 8px;
  padding: 1px 7px;
  border-radius: 999px;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 10px;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
}
input,
textarea,
select {
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
.lang-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.lang-row > :first-child {
  flex: 1;
}
.lang-tag {
  width: 150px;
  flex: none;
}
.details {
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  padding: 12px 14px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.details legend {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 13px;
  color: var(--ink);
  padding: 0 6px;
}
.or-req {
  margin: 0;
  font-size: 12px;
  color: var(--ink-2);
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: var(--r-1);
  background: var(--surface-2);
}
.or-req strong {
  color: var(--ink);
}
</style>
