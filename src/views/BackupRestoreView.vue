<script setup lang="ts">
/**
 * Backup & Restore — an admin-only *informational* surface.
 *
 * The server exposes NO backup/restore/import HTTP API: these are deliberately
 * CLI-only operator actions that read/write the triple store directly, not the
 * LDP API (ADR-0016 §5). So this page performs nothing — it mirrors the server
 * operator runbook (server docs/dev-docs/08-backup-restore.md) as copy-ready
 * command snippets plus the two boundaries to remember. When the server later
 * grows admin backup endpoints (a future ADR), this becomes the place to wire
 * them.
 *
 * The command snippets and their descriptions are kept in English (not i18n'd):
 * they mirror an English operator runbook, the commands themselves are English,
 * and machine-translating instructions for datastore-touching commands into five
 * languages would risk misleading an operator. Only the page chrome is localized.
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import AppIcon from "@/components/shared/AppIcon.vue";

const { t } = useI18n();
const auth = useAuthStore();

interface Command {
  id: string;
  label: string;
  cmd: string;
  desc: string;
}
const COMMANDS: Command[] = [
  {
    id: "dump",
    label: "Dump the store",
    cmd: "fdp backup dump ./backup-2026-07-06",
    desc: "Export every named graph (records + their /meta and /audit siblings) to a versioned archive — records.nq, manifest.json, and audit.jsonl.",
  },
  {
    id: "restore",
    label: "Restore (same identifier base)",
    cmd: "fdp backup restore ./backup-2026-07-06",
    desc: "Load a dump verbatim — provenance, publication state, and audit survive byte-for-byte. Add --merge (skip existing), --overwrite, or --dry-run. Refuses unless the deployment's identifier base equals the dump's.",
  },
  {
    id: "import-rebase",
    label: "Adopt a dump captured under a different base",
    cmd: "fdp backup import ./other-fdp-dump --rebase",
    desc: "Re-roots every IRI — records, cross-links, and the schema binding — from the dump's identifier base to this deployment's.",
  },
  {
    id: "import-from",
    label: "Migrate from another FDP over HTTP",
    cmd: "fdp backup import --from https://old-fdp.example.org",
    desc: "Crawls the source's LDP tree (egress-pinned to its origin), re-roots each record, carries its dates into the meta graph, and preserves the old IRI as a structured alternative identifier (never owl:sameAs).",
  },
  {
    id: "reindex",
    label: "Reindex search after a bare rebase",
    cmd: "fdp search reindex",
    desc: "restore and import reindex automatically; run this yourself only after a bare `fdp pid rebase`.",
  },
];

const CAVEATS = [
  {
    title: "Search reindex is part of the runbook",
    body: "metadata_search is a derived projection. restore and import rebuild it automatically, but a bare `fdp pid rebase` rewrites only the triple store — run `fdp search reindex` yourself afterwards.",
  },
  {
    title: "record_audit keeps historical IRIs",
    body: "A rebase or import rewrites the triple store, but the Postgres record_audit rows intentionally keep the IRIs that were current when each event happened — they are history, not live references.",
  },
];

const copiedId = ref<string | null>(null);
async function copy(id: string, cmd: string) {
  try {
    await navigator.clipboard.writeText(cmd);
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 1500);
  } catch {
    /* clipboard blocked — no-op */
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
      <section class="section" :aria-label="t('backupAdmin.commandsHeading')">
        <h2 class="section__title">{{ t("backupAdmin.commandsHeading") }}</h2>
        <div v-for="c in COMMANDS" :key="c.id" class="cmd">
          <div class="cmd__label">{{ c.label }}</div>
          <p class="cmd__desc">{{ c.desc }}</p>
          <div class="cmd__row">
            <code class="cmd__code mono">{{ c.cmd }}</code>
            <button
              type="button"
              class="btn sm cmd__copy"
              :aria-label="`${t('backupAdmin.copy')}: ${c.cmd}`"
              @click="copy(c.id, c.cmd)"
            >
              <AppIcon v-if="copiedId === c.id" name="check" :size="13" />
              {{ copiedId === c.id ? t("backupAdmin.copied") : t("backupAdmin.copy") }}
            </button>
          </div>
        </div>
      </section>

      <section class="section" :aria-label="t('backupAdmin.caveatsHeading')">
        <h2 class="section__title">{{ t("backupAdmin.caveatsHeading") }}</h2>
        <div v-for="cv in CAVEATS" :key="cv.title" class="caveat">
          <div class="caveat__title">
            <AppIcon name="shield" :size="14" /> {{ cv.title }}
          </div>
          <p class="caveat__body">{{ cv.body }}</p>
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
}
.section__title {
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-semibold);
  font-size: var(--fair-text-sm);
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  color: var(--fair-text-muted);
  margin: 0 0 16px;
}
.cmd {
  padding: 16px 0;
  border-top: 1px solid var(--fair-separator);
}
.cmd:first-of-type {
  border-top: 0;
}
.cmd__label {
  font-weight: var(--fair-weight-semibold);
  color: var(--fair-text-strong);
  font-size: var(--fair-text-md);
}
.cmd__desc {
  margin: 4px 0 10px;
  color: var(--fair-text-muted);
  font-size: var(--fair-text-base);
  line-height: var(--fair-leading-snug);
  max-width: 62ch;
}
.cmd__row {
  display: flex;
  align-items: center;
  gap: 10px;
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
.caveat {
  padding: 14px 16px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  margin-bottom: 12px;
}
.caveat__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--fair-weight-semibold);
  color: var(--fair-text-strong);
  font-size: var(--fair-text-base);
}
.caveat__body {
  margin: 6px 0 0;
  color: var(--fair-text-muted);
  font-size: var(--fair-text-base);
  line-height: var(--fair-leading-normal);
  max-width: 62ch;
}
</style>
