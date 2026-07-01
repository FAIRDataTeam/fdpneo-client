<script setup lang="ts">
/**
 * Factory-reset danger zone (TASKS 10.7).
 *
 * Truncates runtime settings and re-applies the bundled profile — destructive
 * and irreversible. The Reset button stays disabled until the admin types the
 * exact confirmation token (the same literal the server validates), which is the
 * deliberate "type this to confirm" gate. On success we invalidate **every**
 * query cache (the whole app's server state just changed) and report the counts.
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { resetToFactoryDefaults, RESET_CONFIRMATION_TOKEN, type ResetResponse } from "@/api/admin";
import { parseFdpError, type ParsedError } from "@/api/errors";

const { t } = useI18n();
const client = useQueryClient();
const typed = ref("");
const result = ref<ResetResponse | null>(null);
const error = ref<ParsedError | null>(null);

const confirmed = computed(() => typed.value.trim() === RESET_CONFIRMATION_TOKEN);

const reset = useMutation({
  mutationFn: () => resetToFactoryDefaults(RESET_CONFIRMATION_TOKEN),
  onSuccess: async (res) => {
    result.value = res;
    error.value = null;
    typed.value = "";
    // Everything server-side may have changed — drop all cached server state.
    await client.invalidateQueries();
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

function run() {
  if (!confirmed.value || reset.isPending.value) return;
  error.value = null;
  reset.mutate();
}
</script>

<template>
  <section class="danger">
    <h2>{{ t("settingsAdmin.resetHeading") }}</h2>
    <i18n-t keypath="settingsAdmin.resetDesc1" tag="p" class="desc" scope="global">
      <template #cannotBeUndone><strong>{{ t("settingsAdmin.resetCannotBeUndone") }}</strong></template>
    </i18n-t>
    <i18n-t keypath="settingsAdmin.resetConfirmPrompt" tag="p" class="desc" scope="global">
      <template #token><code class="token">{{ RESET_CONFIRMATION_TOKEN }}</code></template>
    </i18n-t>
    <form class="row" @submit.prevent="run">
      <input
        v-model="typed"
        :placeholder="RESET_CONFIRMATION_TOKEN"
        :aria-label="t('settingsAdmin.resetConfirmAria')"
        autocomplete="off"
        spellcheck="false"
      />
      <button class="btn danger" type="submit" :disabled="!confirmed || reset.isPending.value">
        {{ t("settingsAdmin.resetButton") }}
      </button>
    </form>

    <p v-if="error" class="error" role="alert">{{ error.message }}</p>
    <p v-if="result" class="ok" role="status">
      {{ t("settingsAdmin.resetOk", {
        name: result.profileName,
        version: result.profileVersion,
        settings: result.settingsCleared,
        schemas: result.schemas,
        offers: result.offers,
        types: result.resourceDefinitions,
        seed: result.seedRecords,
      }) }}
    </p>
  </section>
</template>

<style scoped>
.danger {
  border: 1px solid var(--signal);
  border-radius: var(--r-3);
  padding: 18px;
  background: var(--signal-soft);
}
.danger h2 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--signal);
}
.desc {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--ink-2);
}
.token {
  font-size: 12px;
}
.row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.row input {
  flex: 1;
  min-width: 220px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  padding: 9px 12px;
}
.btn.danger {
  background: var(--signal);
  color: #fff;
  border-color: transparent;
}
.btn.danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.error {
  color: var(--signal);
  font-size: 13px;
  margin: 10px 0 0;
}
.ok {
  color: var(--ok);
  font-size: 13px;
  margin: 10px 0 0;
}
</style>
