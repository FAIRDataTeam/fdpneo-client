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

const props = defineProps<{ settingKey: string; value: SettingValue; canEdit: boolean }>();

const pretty = (v: SettingValue) => JSON.stringify(v, null, 2);

const draft = ref(pretty(props.value));
const error = ref<ParsedError | null>(null);

// After a successful save/reset the parent refetches and the value prop
// changes; re-sync the draft to the canonical server value and clear errors.
watch(
  () => props.value,
  (v) => {
    draft.value = pretty(v);
    error.value = null;
  },
);

const dirty = computed(() => draft.value !== pretty(props.value));

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

function onSave() {
  let parsed: unknown;
  try {
    parsed = JSON.parse(draft.value);
  } catch {
    error.value = clientError("Invalid JSON", "This value isn't valid JSON — fix the syntax and try again.");
    return;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    error.value = clientError("Must be a JSON object", "A setting value must be a JSON object, e.g. { … }.");
    return;
  }
  error.value = null;
  save.mutate(parsed as SettingValue);
}
</script>

<template>
  <section class="setting">
    <header class="head">
      <code class="key">{{ settingKey }}</code>
      <div v-if="canEdit" class="actions">
        <button class="btn ghost sm" :disabled="busy" @click="reset.mutate()">Reset to default</button>
        <button class="btn primary sm" :disabled="!dirty || busy" @click="onSave">Save</button>
      </div>
    </header>

    <textarea
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
  margin-bottom: 10px;
}
.key {
  font-size: 13px;
  color: var(--ink);
  font-weight: 600;
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
