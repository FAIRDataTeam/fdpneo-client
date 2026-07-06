<script setup lang="ts">
/**
 * Backup & Restore — admin-only, interactive (FDPneo v0.9.0 admin API).
 *
 * Backup and restore are job-based: start → poll → (dump) download. The API is
 * admin-role-gated; the nav entry and this view are gated on the admin role too,
 * and a 403 is surfaced clearly if the API rejects anyway. Import (rebase /
 * reference-FDP crawl) is intentionally CLI-only and is shown only as a reference
 * note — there is no UI for it.
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import {
  startDump,
  startRestore,
  downloadArchive,
  isDumpResult,
  isRestoreResult,
  type BackupJob,
} from "@/api/backup";
import { useBackupJob } from "@/composables/useBackupJob";
import { parseFdpError, type ParsedError } from "@/api/errors";
import AppIcon from "@/components/shared/AppIcon.vue";

const { t } = useI18n();
const auth = useAuthStore();

// ── Backup ──────────────────────────────────────────────────────────────────
const { job: backupJob, busy: backupBusy, error: backupErr, run: runBackup } = useBackupJob();
const dumpNoAudit = ref(false);
const downloadErr = ref<ParsedError | null>(null);

// Typed, narrowed result for the template (a v-if can't discriminate the union).
const dumpResult = computed(() =>
  backupJob.value && isDumpResult(backupJob.value) ? backupJob.value.result : null,
);

function createBackup() {
  downloadErr.value = null;
  void runBackup(() => startDump(dumpNoAudit.value));
}

async function download(id: string) {
  downloadErr.value = null;
  try {
    const blob = await downloadArchive(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fdp-backup-${id}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) {
    downloadErr.value = parseFdpError(e);
  }
}

// ── Restore ─────────────────────────────────────────────────────────────────
const {
  job: restoreJob,
  busy: restoreBusy,
  error: restoreErr,
  run: runRestore,
  reset: resetRestore,
} = useBackupJob();
const restoreFile = ref<File | null>(null);
const merge = ref(false);
const overwrite = ref(false);
const restoreNoAudit = ref(false);
const dryRun = ref(false);
const confirmOpen = ref(false);

const restoreResult = computed(() =>
  restoreJob.value && isRestoreResult(restoreJob.value) ? restoreJob.value.result : null,
);

// Merge and overwrite are mutually exclusive (the server 400s if both are set).
function setMerge(v: boolean) {
  merge.value = v;
  if (v) overwrite.value = false;
}
function setOverwrite(v: boolean) {
  overwrite.value = v;
  if (v) merge.value = false;
}
function onFile(e: Event) {
  resetRestore();
  restoreFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}

function requestRestore() {
  if (!restoreFile.value) return;
  // A dry run writes nothing, so it needs no confirmation; a real restore does.
  if (dryRun.value) doRestore();
  else confirmOpen.value = true;
}
function doRestore() {
  confirmOpen.value = false;
  const file = restoreFile.value;
  if (!file) return;
  void runRestore(() =>
    startRestore(file, {
      merge: merge.value,
      overwrite: overwrite.value,
      noAudit: restoreNoAudit.value,
      dryRun: dryRun.value,
    }),
  );
}

// ── Shared ────────────────────────────────────────────────────────────────
/** Context-aware message for a parsed error (403/404/409/413 get specific copy). */
function errorText(err: ParsedError): string {
  switch (err.status) {
    case 403:
      return t("backupAdmin.forbidden");
    case 413:
      return t("backupAdmin.tooLarge");
    case 409:
      return t("backupAdmin.notReady");
    case 404:
      return t("backupAdmin.gone");
    default:
      return err.message;
  }
}
function stateLabel(job: BackupJob | null): string {
  return job?.state === "RUNNING" ? t("backupAdmin.running") : t("backupAdmin.queued");
}

// Import stays CLI-only (never over HTTP) — shown as a reference note.
const IMPORT_CMDS = [
  "fdp backup import ./other-fdp-dump --rebase",
  "fdp backup import --from https://old-fdp.example.org",
];
const copiedCmd = ref<string | null>(null);
async function copyCmd(cmd: string) {
  try {
    await navigator.clipboard.writeText(cmd);
    copiedCmd.value = cmd;
    setTimeout(() => {
      if (copiedCmd.value === cmd) copiedCmd.value = null;
    }, 1500);
  } catch {
    /* clipboard blocked */
  }
}
</script>

<template>
  <main class="backup">
    <header class="hero">
      <div class="eyebrow mono">{{ t("backupAdmin.eyebrow") }}</div>
      <h1>{{ t("backupAdmin.heading") }}</h1>
      <p class="sub">{{ t("backupAdmin.intro") }}</p>
      <p v-if="!auth.isAdmin" class="notice">{{ t("backupAdmin.adminNotice") }}</p>
    </header>

    <template v-if="auth.isAdmin">
      <!-- Backup -->
      <section class="section" :aria-label="t('backupAdmin.backupHeading')">
        <h2 class="section__title">{{ t("backupAdmin.backupHeading") }}</h2>
        <p class="section__sub">{{ t("backupAdmin.backupSub") }}</p>

        <label class="opt">
          <input v-model="dumpNoAudit" type="checkbox" :disabled="backupBusy" />
          <span>{{ t("backupAdmin.excludeAudit") }}</span>
        </label>

        <div class="actions">
          <button class="btn primary" :disabled="backupBusy" @click="createBackup">
            {{ t("backupAdmin.create") }}
          </button>
          <span v-if="backupBusy" class="progress">
            <span class="spinner" aria-hidden="true" />
            {{ stateLabel(backupJob) }}
          </span>
        </div>

        <p v-if="backupErr" class="msg err" role="alert">{{ errorText(backupErr) }}</p>

        <template v-if="backupJob && !backupBusy">
          <div v-if="backupJob.state === 'FAILED'" class="msg err" role="alert">
            {{ backupJob.error || t("backupAdmin.failed") }}
          </div>
          <div v-else-if="dumpResult" class="result">
            <div class="result__title ok">
              <AppIcon name="check" :size="14" /> {{ t("backupAdmin.resultTitle") }}
            </div>
            <dl class="metrics">
              <div><dt>{{ t("backupAdmin.mGraphs") }}</dt><dd class="mono">{{ dumpResult.graphs }}</dd></div>
              <div><dt>{{ t("backupAdmin.mQuads") }}</dt><dd class="mono">{{ dumpResult.quads }}</dd></div>
              <div><dt>{{ t("backupAdmin.mAuditRows") }}</dt><dd class="mono">{{ dumpResult.audit_rows }}</dd></div>
              <div><dt>{{ t("backupAdmin.mDataModel") }}</dt><dd class="mono">{{ dumpResult.data_model_version }}</dd></div>
            </dl>
            <button class="btn accent" @click="backupJob && download(backupJob.id)">
              <AppIcon name="download" :size="14" /> {{ t("backupAdmin.download") }}
            </button>
            <p v-if="downloadErr" class="msg err" role="alert">{{ errorText(downloadErr) }}</p>
          </div>
        </template>
      </section>

      <!-- Restore -->
      <section class="section" :aria-label="t('backupAdmin.restoreHeading')">
        <h2 class="section__title">{{ t("backupAdmin.restoreHeading") }}</h2>
        <p class="section__sub">{{ t("backupAdmin.restoreSub") }}</p>

        <label class="filepick">
          <input type="file" accept=".zip,application/zip" @change="onFile" />
        </label>

        <div class="opts">
          <label class="opt">
            <input type="checkbox" :checked="merge" @change="setMerge(($event.target as HTMLInputElement).checked)" />
            <span>{{ t("backupAdmin.merge") }} <em>{{ t("backupAdmin.mergeHelp") }}</em></span>
          </label>
          <label class="opt">
            <input type="checkbox" :checked="overwrite" @change="setOverwrite(($event.target as HTMLInputElement).checked)" />
            <span>{{ t("backupAdmin.overwrite") }} <em>{{ t("backupAdmin.overwriteHelp") }}</em></span>
          </label>
          <label class="opt">
            <input v-model="restoreNoAudit" type="checkbox" />
            <span>{{ t("backupAdmin.excludeAudit") }}</span>
          </label>
          <label class="opt">
            <input v-model="dryRun" type="checkbox" />
            <span>{{ t("backupAdmin.dryRun") }} <em>{{ t("backupAdmin.dryRunHelp") }}</em></span>
          </label>
        </div>

        <div class="actions">
          <button
            class="btn"
            :class="dryRun ? 'primary' : 'danger'"
            :disabled="!restoreFile || restoreBusy"
            @click="requestRestore"
          >
            {{ dryRun ? t("backupAdmin.dryRunBtn") : t("backupAdmin.restore") }}
          </button>
          <span v-if="restoreBusy" class="progress">
            <span class="spinner" aria-hidden="true" />
            {{ stateLabel(restoreJob) }}
          </span>
        </div>

        <!-- Destructive confirmation (non-dry-run only) -->
        <div v-if="confirmOpen" class="confirm" role="alertdialog" aria-labelledby="cfm-t">
          <div id="cfm-t" class="confirm__title">
            <AppIcon name="shield" :size="15" />
            {{ overwrite ? t("backupAdmin.confirmTitleOverwrite") : t("backupAdmin.confirmTitle") }}
          </div>
          <p class="confirm__body">{{ t("backupAdmin.confirmBody") }}</p>
          <div class="confirm__actions">
            <button class="btn danger" @click="doRestore">{{ t("backupAdmin.confirmProceed") }}</button>
            <button class="btn ghost" @click="confirmOpen = false">{{ t("backupAdmin.cancel") }}</button>
          </div>
        </div>

        <p v-if="restoreErr" class="msg err" role="alert">{{ errorText(restoreErr) }}</p>

        <template v-if="restoreJob && !restoreBusy">
          <div v-if="restoreJob.state === 'FAILED'" class="msg err" role="alert">
            {{ restoreJob.error || t("backupAdmin.failed") }}
          </div>
          <div v-else-if="restoreResult" class="result">
            <div class="result__title" :class="restoreResult.dry_run ? '' : 'ok'">
              <AppIcon :name="restoreResult.dry_run ? 'eye' : 'check'" :size="14" />
              {{ restoreResult.dry_run ? t("backupAdmin.wouldTitle") : t("backupAdmin.resultTitle") }}
            </div>
            <dl class="metrics">
              <div><dt>{{ t("backupAdmin.mGraphsLoaded") }}</dt><dd class="mono">{{ restoreResult.graphs_loaded }}</dd></div>
              <div><dt>{{ t("backupAdmin.mGraphsSkipped") }}</dt><dd class="mono">{{ restoreResult.graphs_skipped }}</dd></div>
              <div><dt>{{ t("backupAdmin.mQuads") }}</dt><dd class="mono">{{ restoreResult.quads }}</dd></div>
              <div><dt>{{ t("backupAdmin.mProfiles") }}</dt><dd class="mono">{{ restoreResult.profiles_provisioned }}</dd></div>
              <div><dt>{{ t("backupAdmin.mAuditRows") }}</dt><dd class="mono">{{ restoreResult.audit_rows }}</dd></div>
              <div><dt>{{ t("backupAdmin.mRecordsIndexed") }}</dt><dd class="mono">{{ restoreResult.records_indexed }}</dd></div>
              <div v-if="restoreResult.migrated"><dt>{{ t("backupAdmin.mMigrated") }}</dt><dd class="mono">✓</dd></div>
            </dl>
          </div>
        </template>
      </section>

      <!-- Import (CLI-only reference) -->
      <section class="section" :aria-label="t('backupAdmin.importHeading')">
        <h2 class="section__title">{{ t("backupAdmin.importHeading") }}</h2>
        <p class="section__sub">{{ t("backupAdmin.importSub") }}</p>
        <div v-for="cmd in IMPORT_CMDS" :key="cmd" class="cmd__row">
          <code class="cmd__code mono">{{ cmd }}</code>
          <button type="button" class="btn sm cmd__copy" :aria-label="`${t('backupAdmin.copy')}: ${cmd}`" @click="copyCmd(cmd)">
            <AppIcon v-if="copiedCmd === cmd" name="check" :size="13" />
            {{ copiedCmd === cmd ? t("backupAdmin.copied") : t("backupAdmin.copy") }}
          </button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.backup {
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 28px 64px;
  width: 100%;
  box-sizing: border-box;
}
.hero {
  margin-bottom: 28px;
}
.eyebrow {
  font-size: var(--fair-text-xs);
  color: var(--fair-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  margin-bottom: 8px;
}
.hero h1 {
  margin: 0 0 8px;
}
.sub {
  color: var(--fair-text);
  margin: 0;
  max-width: 62ch;
  line-height: var(--fair-leading-normal);
}
.notice {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: var(--fair-radius-md);
  background: var(--fair-highlight);
  color: var(--fair-text);
  font-size: var(--fair-text-base);
}
.section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--fair-separator);
}
.section__title {
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-semibold);
  font-size: var(--fair-text-sm);
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  color: var(--fair-text-muted);
  margin: 0 0 6px;
}
.section__sub {
  margin: 0 0 16px;
  color: var(--fair-text-muted);
  font-size: var(--fair-text-base);
  line-height: var(--fair-leading-snug);
  max-width: 62ch;
}
.opts {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}
.opt {
  display: flex;
  gap: 9px;
  align-items: baseline;
  font-size: var(--fair-text-base);
  color: var(--fair-text-strong);
  cursor: pointer;
}
.opt em {
  display: block;
  font-style: normal;
  color: var(--fair-text-muted);
  font-size: var(--fair-text-sm);
}
.filepick {
  display: block;
  margin-bottom: 16px;
  font-size: var(--fair-text-base);
}
.actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.btn.danger {
  background: var(--fair-danger);
  color: #fff;
  border-color: var(--fair-danger);
}
.btn.danger:hover {
  filter: brightness(0.94);
}
.btn.accent {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.progress {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--fair-text-muted);
  font-size: var(--fair-text-base);
}
.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid var(--fair-border);
  border-top-color: var(--tool-accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
.msg {
  margin: 14px 0 0;
  font-size: var(--fair-text-base);
}
.msg.err {
  color: var(--fair-danger);
}
.result {
  margin-top: 16px;
  padding: 16px 18px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
}
.result__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: var(--fair-weight-semibold);
  color: var(--fair-text-strong);
  margin-bottom: 12px;
}
.result__title.ok {
  color: var(--fair-success);
}
.metrics {
  margin: 0 0 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px 20px;
}
.metrics div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.metrics dt {
  font-size: var(--fair-text-xs);
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  color: var(--fair-text-muted);
}
.metrics dd {
  margin: 0;
  font-size: var(--fair-text-lg);
  color: var(--fair-text-strong);
}
.confirm {
  margin-top: 16px;
  padding: 16px 18px;
  border: 1px solid var(--fair-danger);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-danger-tint);
}
.confirm__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--fair-weight-semibold);
  color: var(--fair-text-strong);
}
.confirm__body {
  margin: 8px 0 14px;
  color: var(--fair-text);
  font-size: var(--fair-text-base);
  line-height: var(--fair-leading-snug);
  max-width: 60ch;
}
.confirm__actions {
  display: flex;
  gap: 10px;
}
.cmd__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.cmd__code {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  white-space: pre;
  padding: 10px 12px;
  background: var(--fair-code-bg);
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  color: var(--fair-text);
  font-size: var(--fair-text-sm);
}
.cmd__copy {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
</style>
