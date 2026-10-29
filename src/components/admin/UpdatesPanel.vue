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
 *
 * With the optional host updater connected (server ADR-0030), each component
 * offers "Update to X" for the newest release the agent may apply unattended,
 * with a confirmation step, and the panel lists recent requests and outcomes.
 */
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useUpdateRequests, useUpdates } from "@/composables/useUpdates";
import {
  OPEN_REQUEST_STATUSES,
  applyBlocker,
  newerThan,
  type ApplyBlocker,
  type Component,
  type ReleaseInfo,
} from "@/api/updates";
import { parseFdpError } from "@/api/errors";

const { t } = useI18n();
const { view, isLoading, isError, checkNow, clientVersion } = useUpdates();
const requests = useUpdateRequests();
const error = ref<string | null>(null);
const confirming = ref<string | null>(null);

// The agent finished an open request: the running versions changed.
watch(requests.hasOpen, (open, wasOpen) => {
  if (wasOpen && !open) void requests.refreshVersions();
});

const agentConnected = computed(() => requests.list.value?.agent_connected === true);

interface Offer {
  release: ReleaseInfo;
  blocker: ApplyBlocker | null;
}

function offerFor(row: Row): Offer | null {
  const release = row.newer[0];
  if (!release || !view.value) return null;
  return {
    release,
    blocker: applyBlocker(row.component, release, row.current, view.value.server_version),
  };
}

const offerKey = (component: Component, version: string) => `${component}@${version}`;

async function onUpdate(row: Row, version: string) {
  const key = offerKey(row.component, version);
  if (confirming.value !== key) {
    confirming.value = key;
    return;
  }
  confirming.value = null;
  error.value = null;
  try {
    await requests.request.mutateAsync({
      component: row.component,
      version,
      from_version: row.component === "client" ? row.current : null,
    });
  } catch (e) {
    const parsed = parseFdpError(e);
    error.value = `${parsed.title}: ${parsed.message}`;
  }
}

async function onCancel(id: string) {
  error.value = null;
  try {
    await requests.cancel.mutateAsync(id);
  } catch (e) {
    const parsed = parseFdpError(e);
    error.value = `${parsed.title}: ${parsed.message}`;
  }
}

interface Row {
  component: Component;
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
              <template v-if="agentConnected && offerFor(row)">
                <p v-if="offerFor(row)?.blocker" class="blocker">
                  {{ t(`updates.blocker.${offerFor(row)?.blocker}`) }}
                </p>
                <button
                  v-else
                  type="button"
                  class="btn sm"
                  :class="confirming === offerKey(row.component, row.newer[0]?.version ?? '') ? 'primary' : 'ghost'"
                  :disabled="requests.hasOpen.value || requests.request.isPending.value"
                  @click="onUpdate(row, row.newer[0]?.version ?? '')"
                >
                  {{
                    confirming === offerKey(row.component, row.newer[0]?.version ?? "")
                      ? t("updates.confirmUpdate", { version: row.newer[0]?.version })
                      : t("updates.updateTo", { version: row.newer[0]?.version })
                  }}
                </button>
              </template>
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

      <h3>{{ t("updates.updaterHeading") }}</h3>
      <p v-if="agentConnected" class="meta">
        {{
          t("updates.agentConnected", {
            version: requests.list.value?.agent_version ?? "?",
            when: when(requests.list.value?.agent_last_seen),
          })
        }}
      </p>
      <p v-else class="meta">{{ t("updates.agentMissing") }}</p>

      <table v-if="requests.list.value?.requests.length" class="versions history">
        <thead>
          <tr>
            <th>{{ t("updates.colComponent") }}</th>
            <th>{{ t("updates.colChange") }}</th>
            <th>{{ t("updates.colStatus") }}</th>
            <th>{{ t("updates.colRequested") }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in requests.list.value?.requests ?? []" :key="r.id">
            <td>{{ t(r.component === "server" ? "updates.server" : "updates.client") }}</td>
            <td class="mono">{{ r.from_version }} → {{ r.target_version }}</td>
            <td>
              <span class="badge" :class="`status-${r.status}`">{{ t(`updates.status.${r.status}`) }}</span>
              <span v-if="r.message" class="note">{{ r.message }}</span>
              <span v-if="r.backup_location" class="note">{{ t("updates.backupAt", { location: r.backup_location }) }}</span>
            </td>
            <td>{{ when(r.requested_at) }}</td>
            <td>
              <button
                v-if="r.status === 'pending'"
                type="button"
                class="btn ghost sm"
                :disabled="requests.cancel.isPending.value"
                @click="onCancel(r.id)"
              >
                {{ t("updates.cancel") }}
              </button>
              <span v-else-if="OPEN_REQUEST_STATUSES.has(r.status)" class="note">{{ t("updates.inProgress") }}</span>
            </td>
          </tr>
        </tbody>
      </table>
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
h3 {
  margin: 18px 0 6px;
  font-size: 14px;
}
.blocker,
.note {
  display: block;
  margin: 6px 0 0;
  color: var(--fair-text-muted);
  font-size: 12px;
}
.badge.status-succeeded {
  background: var(--fair-success, #2e7d32);
  color: #fff;
}
.badge.status-failed,
.badge.status-needs_attention {
  background: var(--fair-danger, #c62828);
  color: #fff;
}
.error {
  margin: 10px 0;
  color: var(--fair-danger, #c62828);
  font-size: 13px;
}
</style>
