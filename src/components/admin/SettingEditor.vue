<script setup lang="ts">
/**
 * Editor for one instance-settings key (TASKS 10.5).
 *
 * The server validates each key's *shape* itself (Pydantic) and the OpenAPI
 * types the value only as an open object, so we edit it as JSON: parse + an
 * "is it an object" check client-side, then let the server's 422 surface the
 * semantic detail inline (e.g. an unknown facet field in `search.filters`).
 * Non-admins see the value read-only.
 */
import { computed, ref, watch } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { putSetting, resetSetting, type SettingValue } from "@/api/settings";
import { useInvalidateSettings } from "@/composables/useSettings";
import { parseFdpError, type ParsedError } from "@/api/errors";
import SearchFiltersEditor from "./SearchFiltersEditor.vue";
import AutocompleteSourcesEditor from "./AutocompleteSourcesEditor.vue";

const props = defineProps<{ settingKey: string; value: SettingValue; canEdit: boolean }>();

// Human-readable title + help for known keys; unknown keys fall back to the raw
// dotted key with no help line. (The value is still edited as JSON below — a
// per-key structured form editor is a planned follow-up, see TASKS 12.7.)
const SETTING_META: Record<string, { title: string; help: string }> = {
  "search.filters": {
    title: "Search facets",
    help: "The facet dimensions shown on the search page — each maps a label to the metadata property it filters on.",
  },
  "forms.autocomplete-sources": {
    title: "Form autocomplete sources",
    help: "Suggestion lists offered in authoring forms (e.g. licenses, media types) — either an inline set of IRI/label entries or a SPARQL-backed source.",
  },
};
const meta = computed(() => SETTING_META[props.settingKey] ?? null);

// Keys with a structured form editor; everything else edits as raw JSON.
const structuredKind = computed<"filters" | "autocomplete" | null>(() => {
  if (props.settingKey === "search.filters") return "filters";
  if (props.settingKey === "forms.autocomplete-sources") return "autocomplete";
  return null;
});
// Raw-JSON escape hatch, available even for structured keys.
const useRaw = ref(false);

const pretty = (v: SettingValue) => JSON.stringify(v, null, 2);
// Settings values are JSON by definition, so a JSON round-trip is a safe deep
// clone — and avoids structuredClone choking on the reactive prop proxy.
const clone = (v: SettingValue): SettingValue => JSON.parse(JSON.stringify(v));

const draft = ref(pretty(props.value));
// Structured editing works on a deep copy; saved as-is.
const model = ref<SettingValue>(clone(props.value));
const error = ref<ParsedError | null>(null);

// After a successful save/reset the parent refetches and the value prop
// changes; re-sync both editors to the canonical server value and clear errors.
watch(
  () => props.value,
  (v) => {
    draft.value = pretty(v);
    model.value = clone(v);
    error.value = null;
  },
);

const dirty = computed(() =>
  structuredKind.value && !useRaw.value
    ? JSON.stringify(model.value) !== JSON.stringify(props.value)
    : draft.value !== pretty(props.value),
);

const invalidate = useInvalidateSettings();

function clientError(title: string, message: string): ParsedError {
  return { title, message, code: "client.validation", status: null, docsUrl: null, violations: [], fromServer: false };
}

const save = useMutation({
  mutationFn: (val: SettingValue) => putSetting(props.settingKey, val),
  onSuccess: async () => {
    error.value = null;
    await invalidate();
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

const reset = useMutation({
  mutationFn: () => resetSetting(props.settingKey),
  onSuccess: async () => {
    error.value = null;
    await invalidate();
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

const busy = computed(() => save.isPending.value || reset.isPending.value);

/** Parse + object-check the raw-JSON draft. */
function parseDraft(): SettingValue | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(draft.value);
  } catch {
    error.value = clientError("Invalid JSON", "This value isn't valid JSON — fix the syntax and try again.");
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    error.value = clientError("Must be a JSON object", "A setting value must be a JSON object, e.g. { … }.");
    return null;
  }
  return parsed as SettingValue;
}

function onSave() {
  if (structuredKind.value && !useRaw.value) {
    error.value = null;
    save.mutate(model.value);
    return;
  }
  const parsed = parseDraft();
  if (parsed === null) return;
  error.value = null;
  save.mutate(parsed);
}

/** Flip between the structured form and the raw-JSON textarea, syncing content. */
function toggleRaw() {
  if (!useRaw.value) {
    draft.value = pretty(model.value); // form → raw
    useRaw.value = true;
    return;
  }
  const parsed = parseDraft(); // raw → form (only if it parses)
  if (parsed === null) return;
  model.value = parsed;
  error.value = null;
  useRaw.value = false;
}
</script>

<template>
  <section class="setting">
    <header class="head">
      <div class="titles">
        <span class="title">{{ meta?.title ?? settingKey }}</span>
        <code v-if="meta" class="key">{{ settingKey }}</code>
      </div>
      <div v-if="canEdit" class="actions">
        <button
          v-if="structuredKind"
          type="button"
          class="btn ghost sm"
          @click="toggleRaw"
        >
          {{ useRaw ? "Use form" : "Edit as JSON" }}
        </button>
        <button class="btn ghost sm" :disabled="busy" @click="reset.mutate()">Reset to default</button>
        <button class="btn primary sm" :disabled="!dirty || busy" @click="onSave">Save</button>
      </div>
    </header>
    <p v-if="meta" class="help">{{ meta.help }}</p>

    <SearchFiltersEditor
      v-if="structuredKind === 'filters' && !useRaw"
      v-model="model"
      :can-edit="canEdit"
    />
    <AutocompleteSourcesEditor
      v-else-if="structuredKind === 'autocomplete' && !useRaw"
      v-model="model"
      :can-edit="canEdit"
    />
    <textarea
      v-else
      v-model="draft"
      class="json"
      spellcheck="false"
      rows="8"
      :readonly="!canEdit"
      :aria-label="`${settingKey} value (JSON)`"
    />

    <div v-if="error" class="error" role="alert">
      <strong>{{ error.title }}</strong>
      <p>{{ error.message }}</p>
      <ul v-if="error.violations.length" class="violations">
        <li v-for="(v, i) in error.violations" :key="i">
          <span v-if="v.path" class="vpath mono">{{ v.path }}</span> {{ v.message }}
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.setting {
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  padding: 16px;
  background: var(--surface);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}
.titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.title {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.key {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
}
.help {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
  max-width: 70ch;
}
.actions {
  display: flex;
  gap: 8px;
}
.json {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  line-height: 1.5;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  resize: vertical;
}
.json[readonly] {
  opacity: 0.85;
}
.error {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--r-2);
  background: var(--signal-soft);
  color: var(--signal);
  font-size: 13px;
}
.error p {
  margin: 4px 0 0;
}
.violations {
  margin: 6px 0 0;
  padding-left: 18px;
}
.vpath {
  font-size: 12px;
}
</style>
