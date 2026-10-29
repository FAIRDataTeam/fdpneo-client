<script setup lang="ts">
/**
 * Updates panel in Instance settings (server ADR-0028).
 *
 * Shows the running and latest server/client versions, when the server last
 * checked GitHub, why checks are off (deployment switch or the `updates.check`
 * setting), any error from the last check, the releases this deployment is
 * behind with their security / manual-steps flags, and a "Check now" action
 * (the server allows one per minute). Admin-only; SettingsView mounts it for
 * admins.
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useUpdates } from "@/composables/useUpdates";
import { newerThan, type ReleaseInfo } from "@/api/updates";
import { parseFdpError } from "@/api/errors";

const { t } = useI18n();
const { view, isLoading, isError, checkNow, clientVersion } = useUpdates();
const error = ref<string | null>(null);

interface Row {
  component: "server" | "client";
  current: string;
  latest: string | null;
  newer: ReleaseInfo[];
}

const rows = computed<Row[]>(() => {
  const v = view.value;
  if (!v) return [];
  return [
    {
      component: "server",
      current: v.server_version,
      latest: v.latest_server,
      newer: v.server_releases,
    },
    {
      component: "client",
      current: clientVersion,
      latest: v.latest_client,
      newer: newerThan(v.client_releases, clientVersion),
    },
  ];
});

const when = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 16).replace("T", " ") : t("updates.never");

async function onCheck() {
  if (checkNow.isPending.value) return;
  error.value = null;
  try {
    await checkNow.mutateAsync();
  } catch (e) {
    const parsed = parseFdpError(e);
    error.value = `${parsed.title}: ${parsed.message}`;
  }
}
</script>

<template>
  <section class="panel">
    <header>
      <h2>{{ t("updates.heading") }}</h2>
      <p class="sub">{{ t("updates.sub") }}</p>
    </header>

    <div v-if="isLoading" class="state">{{ t("updates.loading") }}</div>
    <div v-else-if="isError || !view" class="state">{{ t("updates.loadError") }}</div>
    <template v-else>
      <p v-if="!view.env_enabled" class="state">{{ t("updates.disabledByEnv") }}</p>
      <p v-else-if="!view.enabled" class="state">{{ t("updates.disabledBySetting") }}</p>

      <table class="versions">
        <thead>
          <tr>
            <th>{{ t("updates.colComponent") }}</th>
            <th>{{ t("updates.colRunning") }}</th>
            <th>{{ t("updates.colLatest") }}</th>
            <th>{{ t("updates.colStatus") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.component">
            <td>{{ t(row.component === "server" ? "updates.server" : "updates.client") }}</td>
            <td class="mono">{{ row.current }}</td>
            <td class="mono">{{ row.latest ?? "—" }}</td>
            <td>
              <span v-if="!row.newer.length">{{ t("updates.upToDate") }}</span>
              <ul v-else class="releases">
                <li v-for="r in row.newer" :key="r.version">
                  <a :href="r.url" target="_blank" rel="noopener noreferrer" class="mono">{{ r.version }}</a>
                  <span v-if="r.security" class="badge security">{{ t("updates.securityTag") }}</span>
                  <span v-if="r.manual_steps" class="badge">{{ t("updates.manualStepsTag") }}</span>
                  <span v-if="!r.metadata_present" class="badge muted">{{ t("updates.noMetadataTag") }}</span>
                  <a v-if="r.upgrade_notes" :href="r.upgrade_notes" target="_blank" rel="noopener noreferrer">{{
                    t("updates.upgradeNotes")
                  }}</a>
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="meta">
        {{ t("updates.lastChecked", { when: when(view.checked_at) }) }}
      </p>
      <p v-if="view.error" class="error" role="alert">{{ t("updates.checkError", { error: view.error }) }}</p>

      <button
        type="button"
        class="btn ghost"
        :disabled="!view.enabled || checkNow.isPending.value"
        @click="onCheck"
      >
        {{ checkNow.isPending.value ? t("updates.checking") : t("updates.checkNow") }}
      </button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </template>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  padding: 18px 20px;
}
.panel h2 {
  margin: 0 0 4px;
  font-size: var(--fair-text-md);
}
.sub {
  margin: 0 0 14px;
  color: var(--fair-text-muted);
  font-size: 13px;
}
.state,
.meta {
  color: var(--fair-text-muted);
  font-size: 13px;
  margin: 0 0 10px;
}
.versions {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-bottom: 12px;
}
.versions th {
  text-align: left;
  color: var(--fair-text-muted);
  font-weight: 500;
  padding: 4px 10px 6px 0;
  border-bottom: 1px solid var(--fair-border);
}
.versions td {
  padding: 8px 10px 8px 0;
  border-bottom: 1px solid var(--fair-border);
  vertical-align: top;
}
.releases {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.releases li {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}
.badge {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--fair-highlight);
}
.badge.security {
  color: #fff;
  background: var(--fair-danger, #c62828);
}
.badge.muted {
  opacity: 0.75;
}
.error {
  margin: 10px 0;
  color: var(--fair-danger, #c62828);
  font-size: 13px;
}
</style>
