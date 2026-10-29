<script setup lang="ts">
/**
 * Structured editor for the `access.control` setting (server ADR-0027).
 *
 * Mirrors the server `AccessControl` shape: `{ mode: "open" | "odrl",
 * writer_roles: string[] }`. "Open" is the product default — every record is
 * publicly readable and the listed realm roles may write; no ODRL policy is
 * evaluated. "ODRL" switches on the full policy engine (per-record
 * `dct:rights`, inheritance, managed policies). Writes the whole value back
 * through `v-model` on every change, like the other structured editors.
 */
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { SettingValue } from "@/api/settings";

const { t } = useI18n();

type Mode = "open" | "odrl";

const model = defineModel<SettingValue>({ required: true });
defineProps<{ canEdit: boolean }>();

const asMode = (v: unknown): Mode => (v === "odrl" ? "odrl" : "open");
const asRoles = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((r): r is string => typeof r === "string") : [];

const state = reactive({
  mode: asMode(model.value.mode),
  // Edited as one comma-separated line; split on the way out.
  rolesText: asRoles(model.value.writer_roles).join(", "),
});

const roles = computed(() =>
  state.rolesText
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.length > 0),
);

watch(
  () => [state.mode, roles.value] as const,
  ([mode, writerRoles]) => {
    model.value = { mode, writer_roles: writerRoles };
  },
);

// External reset (parent refetch / "Reset to default") re-syncs the form.
watch(
  () => model.value,
  (v) => {
    const mode = asMode(v.mode);
    const text = asRoles(v.writer_roles).join(", ");
    if (mode !== state.mode) state.mode = mode;
    if (text !== state.rolesText && asRoles(v.writer_roles).join(",") !== roles.value.join(",")) {
      state.rolesText = text;
    }
  },
);
</script>

<template>
  <fieldset class="access" :disabled="!canEdit">
    <legend class="sr-only">{{ t("settingsAdmin.metaAccessTitle") }}</legend>

    <label class="option" :class="{ active: state.mode === 'open' }">
      <input v-model="state.mode" type="radio" name="access-mode" value="open" />
      <span class="option__body">
        <span class="option__title">{{ t("settingsAdmin.accessModeOpen") }}</span>
        <span class="option__desc">{{ t("settingsAdmin.accessModeOpenDesc") }}</span>
      </span>
    </label>

    <label class="option" :class="{ active: state.mode === 'odrl' }">
      <input v-model="state.mode" type="radio" name="access-mode" value="odrl" />
      <span class="option__body">
        <span class="option__title">{{ t("settingsAdmin.accessModeOdrl") }}</span>
        <span class="option__desc">{{ t("settingsAdmin.accessModeOdrlDesc") }}</span>
      </span>
    </label>

    <label v-if="state.mode === 'open'" class="field">
      <span class="lbl">{{ t("settingsAdmin.accessWriterRoles") }}</span>
      <input
        v-model="state.rolesText"
        class="mono"
        :placeholder="t('settingsAdmin.accessWriterRolesPlaceholder')"
        :aria-describedby="'access-writer-roles-help'"
      />
      <span id="access-writer-roles-help" class="help">{{ t("settingsAdmin.accessWriterRolesHelp") }}</span>
      <span v-if="!roles.length" class="warn" role="alert">{{ t("settingsAdmin.accessWriterRolesEmpty") }}</span>
    </label>
  </fieldset>
</template>

<style scoped>
.access {
  border: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  background: var(--fair-bg);
  cursor: pointer;
}
.option.active {
  border-color: var(--fair-accent, var(--fair-text-strong));
}
.option input {
  margin-top: 3px;
}
.option__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.option__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--fair-text-strong);
}
.option__desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--fair-text-muted);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}
.lbl {
  font-size: 12px;
  font-weight: 600;
  color: var(--fair-text-strong);
}
.field input {
  padding: 8px 10px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  background: var(--fair-bg);
  color: var(--fair-text-strong);
  font-size: 13px;
}
.help {
  font-size: 12px;
  color: var(--fair-text-muted);
}
.warn {
  font-size: 12px;
  color: var(--fair-warning);
}
.access:disabled .option {
  cursor: default;
  opacity: 0.85;
}
</style>
