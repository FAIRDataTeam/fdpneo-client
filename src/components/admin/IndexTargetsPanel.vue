<script setup lang="ts">
/**
 * FDP Index targets admin panel (server ADR-0025, /fdp-api/index/*).
 *
 * Lists the indexes this FDP announces itself to — env-configured entries
 * (read-only) and runtime rows (removable) — with each target's last ping
 * outcome, an add form, and a "Ping now" action that announces immediately
 * and shows per-target results. Admin-only (the server 403s otherwise);
 * SettingsView mounts it only for admins.
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useIndexTargets } from "@/composables/useIndexTargets";
import { parseFdpError } from "@/api/errors";
import type { PingResultView } from "@/api/indexTargets";

const { t } = useI18n();
const { targets, isLoading, isError, add, remove, ping } = useIndexTargets();

const url = ref("");
const note = ref("");
const error = ref<string | null>(null);
const pingResults = ref<PingResultView[] | null>(null);

async function submitAdd() {
  if (!url.value.trim() || add.isPending.value) return;
  error.value = null;
  try {
    await add.mutateAsync({ url: url.value.trim(), note: note.value.trim() || null });
    url.value = "";
    note.value = "";
  } catch (e) {
    const parsed = parseFdpError(e);
    error.value = `${parsed.title}: ${parsed.message}`;
  }
}

async function submitRemove(id: string) {
  error.value = null;
  try {
    await remove.mutateAsync(id);
  } catch (e) {
    const parsed = parseFdpError(e);
    error.value = `${parsed.title}: ${parsed.message}`;
  }
}

async function submitPing() {
  if (ping.isPending.value) return;
  error.value = null;
  pingResults.value = null;
  try {
    pingResults.value = await ping.mutateAsync();
  } catch (e) {
    const parsed = parseFdpError(e);
    error.value = `${parsed.title}: ${parsed.message}`;
  }
}

const when = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 16).replace("T", " ") : "—";
</script>

<template>
  <section class="panel">
    <header>
      <h2>{{ t("indexTargets.heading") }}</h2>
      <p class="sub">{{ t("indexTargets.sub") }}</p>
    </header>

    <div v-if="isLoading" class="state">{{ t("indexTargets.loading") }}</div>
    <div v-else-if="isError" class="state">{{ t("indexTargets.loadError") }}</div>
    <template v-else>
      <p v-if="!targets.length" class="state">{{ t("indexTargets.none") }}</p>
      <table v-else class="targets">
        <thead>
          <tr>
            <th>{{ t("indexTargets.colUrl") }}</th>
            <th>{{ t("indexTargets.colSource") }}</th>
            <th>{{ t("indexTargets.colLastPing") }}</th>
            <th aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tg in targets" :key="tg.id ?? tg.url">
            <td>
              <span class="mono">{{ tg.url }}</span>
              <span v-if="tg.note" class="note">{{ tg.note }}</span>
            </td>
            <td>
              <span class="badge" :class="tg.source">{{
                tg.source === "env" ? t("indexTargets.sourceEnv") : t("indexTargets.sourceRuntime")
              }}</span>
            </td>
            <td>
              <template v-if="tg.last_ping_at">
                <span class="dot" :class="tg.last_ok ? 'ok' : 'fail'" aria-hidden="true"></span>
                {{ when(tg.last_ping_at) }}
                <span v-if="!tg.last_ok" class="detail">{{
                  tg.last_detail ?? tg.last_status_code ?? ""
                }}</span>
              </template>
              <template v-else>{{ t("indexTargets.neverPinged") }}</template>
            </td>
            <td class="row-actions">
              <button
                v-if="tg.id"
                class="btn ghost small"
                type="button"
                :disabled="remove.isPending.value"
                @click="submitRemove(tg.id)"
              >
                {{ t("indexTargets.remove") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <form class="add" @submit.prevent="submitAdd">
        <input
          v-model="url"
          type="url"
          required
          :placeholder="t('indexTargets.urlPlaceholder')"
          :aria-label="t('indexTargets.colUrl')"
        />
        <input
          v-model="note"
          type="text"
          :placeholder="t('indexTargets.notePlaceholder')"
          :aria-label="t('indexTargets.notePlaceholder')"
        />
        <button class="btn primary" type="submit" :disabled="add.isPending.value || !url.trim()">
          {{ t("indexTargets.add") }}
        </button>
        <button
          class="btn ghost"
          type="button"
          :disabled="ping.isPending.value || !targets.length"
          @click="submitPing"
        >
          {{ ping.isPending.value ? t("indexTargets.pinging") : t("indexTargets.pingNow") }}
        </button>
      </form>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <ul v-if="pingResults" class="ping-results">
        <li v-for="r in pingResults" :key="r.target">
          <span class="dot" :class="r.ok ? 'ok' : 'fail'" aria-hidden="true"></span>
          <span class="mono">{{ r.target }}</span>
          <span>{{
            r.ok ? t("indexTargets.pingOk") : (r.detail ?? t("indexTargets.pingFailed"))
          }}</span>
        </li>
        <li v-if="!pingResults.length" class="state">{{ t("indexTargets.pingNoTargets") }}</li>
      </ul>
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
.state {
  color: var(--fair-text-muted);
  padding: 8px 0;
}
.targets {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-bottom: 14px;
}
.targets th {
  text-align: left;
  color: var(--fair-text-muted);
  font-weight: 500;
  padding: 4px 10px 6px 0;
  border-bottom: 1px solid var(--fair-border);
}
.targets td {
  padding: 8px 10px 8px 0;
  border-bottom: 1px solid var(--fair-border);
  vertical-align: top;
}
.note {
  display: block;
  color: var(--fair-text-muted);
}
.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--fair-highlight);
}
.badge.env {
  opacity: 0.75;
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.dot.ok {
  background: var(--fair-success, #2e7d32);
}
.dot.fail {
  background: var(--fair-danger, #c62828);
}
.detail {
  margin-left: 6px;
  color: var(--fair-text-muted);
}
.row-actions {
  text-align: right;
}
.add {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.add input[type="url"] {
  flex: 2 1 260px;
}
.add input[type="text"] {
  flex: 1 1 160px;
}
.error {
  margin: 10px 0 0;
  color: var(--fair-danger, #c62828);
  font-size: 13px;
}
.ping-results {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
