<script setup lang="ts">
/**
 * Instance settings admin (TASKS 10.5; unblocks legacy 9.7).
 *
 * Lists every runtime settings key the server exposes (`GET /settings`, merged
 * with defaults) and lets an admin edit each as JSON (`PUT /settings/{key}`),
 * with server 422 validation surfaced inline. The interesting keys are
 * `search.filters` (the facet dimensions/labels the search page reads) and
 * `forms.autocomplete-sources` (the autocomplete sources, see 10.6) — but we
 * render whatever keys the server reports rather than hardcoding a list, so new
 * server-defined keys appear automatically. Non-admins get a read-only view.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { useSettings } from "@/composables/useSettings";
import type { SettingValue } from "@/api/settings";
import SettingEditor from "@/components/admin/SettingEditor.vue";
import ResetPanel from "@/components/admin/ResetPanel.vue";

const { t } = useI18n();
const auth = useAuthStore();
const { settings, isLoading, isError } = useSettings();

// Stable, alphabetical key order so the list doesn't jump around on refetch.
const entries = computed<[string, SettingValue][]>(() =>
  Object.keys(settings.value)
    .sort()
    .map((key) => [key, settings.value[key] ?? {}]),
);
</script>

<template>
  <main class="settings">
    <header class="hero">
      <h1>{{ t("settingsAdmin.heading") }}</h1>
      <p class="sub">
        {{ t("settingsAdmin.sub") }}
      </p>
      <p v-if="!auth.isAdmin" class="notice">
        {{ t("settingsAdmin.readOnlyNotice") }}
      </p>
    </header>

    <div v-if="isLoading" class="state">{{ t("settingsAdmin.loading") }}</div>
    <div v-else-if="isError" class="state">
      {{ t("settingsAdmin.loadError") }}
    </div>
    <div v-else-if="!entries.length" class="state">{{ t("settingsAdmin.none") }}</div>
    <div v-else class="list">
      <SettingEditor
        v-for="[key, value] in entries"
        :key="key"
        :setting-key="key"
        :value="value"
        :can-edit="auth.isAdmin"
      />
    </div>

    <ResetPanel v-if="auth.isAdmin" class="reset" />
  </main>
</template>

<style scoped>
.settings {
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 28px 64px;
  width: 100%;
  box-sizing: border-box;
}
.hero {
  margin-bottom: 24px;
}
.hero h1 {
  margin: 0 0 6px;
}
.sub {
  color: var(--fair-text-muted);
  margin: 0;
}
.notice {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: var(--fair-radius-md);
  background: var(--fair-highlight);
  color: var(--fair-text);
  font-size: 13px;
}
.state {
  color: var(--fair-text-muted);
  padding: 24px 0;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.reset {
  margin-top: 32px;
}
</style>
