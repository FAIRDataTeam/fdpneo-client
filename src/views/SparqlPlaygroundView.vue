<script setup lang="ts">
/**
 * SPARQL playground.
 *
 * Monaco editor → POST /sparql → results. SELECT renders as a table, ASK as a
 * boolean, CONSTRUCT/DESCRIBE as a Turtle document. Query history is kept in
 * memory only (no browser storage, per CLAUDE.md).
 *
 * Error handling (TASKS 3.2) leans on the server's structured envelopes:
 *   - 401 / fdp.unauthenticated  → sign-in prompt
 *   - 403 / fdp.policy_violation → the server message names the graph
 *   - 400 (SERVICE / ambiguous update) → the server message explains why,
 *     including the suggested rewrite for ambiguous updates
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { runSparqlQuery, type SparqlQueryResult } from "@/api/sparql";
import { parseFdpError, type ParsedError } from "@/api/errors";
import { safeHref } from "@/composables/safeUrl";
import { useSparqlHistoryStore } from "@/stores/sparqlHistory";
import SparqlEditor from "@/components/sparql/SparqlEditor.vue";
import SparqlResultsTable from "@/components/sparql/SparqlResultsTable.vue";

const { t } = useI18n();
const auth = useAuthStore();
const history = useSparqlHistoryStore();

const EXAMPLES = computed<{ label: string; query: string }[]>(() => [
  {
    label: t("sparql.exAllByType"),
    query: "SELECT ?resource ?type WHERE { GRAPH ?resource { ?resource a ?type } } LIMIT 50",
  },
  {
    label: t("sparql.exCatalogs"),
    query:
      "SELECT ?catalog ?title WHERE {\n  GRAPH ?catalog {\n    ?catalog a <http://www.w3.org/ns/dcat#Catalog> ;\n             <http://purl.org/dc/terms/title> ?title .\n  }\n}",
  },
  {
    label: t("sparql.exDescribe"),
    query: "DESCRIBE <http://localhost:8000/dataset/ad-cohort-2024>",
  },
]);

const query = ref(EXAMPLES.value[0]!.query);
const result = ref<SparqlQueryResult | null>(null);
const error = ref<ParsedError | null>(null);
const running = ref(false);

const needsLogin = computed(
  () => error.value?.status === 401 || error.value?.code === "fdp.unauthenticated",
);

async function run() {
  if (running.value || !query.value.trim()) return;
  running.value = true;
  error.value = null;
  result.value = null;
  try {
    result.value = await runSparqlQuery(query.value);
    history.add(query.value);
  } catch (e) {
    error.value = parseFdpError(e);
  } finally {
    running.value = false;
  }
}

function loadExample(q: string) {
  if (q) query.value = q;
}

function recall(q: string) {
  query.value = q;
}

function timeLabel(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
</script>

<template>
  <section class="page">
    <header class="page__head">
      <div>
        <div class="eyebrow mono">{{ t("sparql.eyebrow") }}</div>
        <h1>{{ t("sparql.heading") }}</h1>
        <p class="lede">
          {{ t("sparql.lede") }}
        </p>
      </div>
    </header>

    <div class="layout">
      <div class="main">
        <div class="toolbar">
          <button class="btn primary" :disabled="running" @click="run">
            {{ running ? t("sparql.running") : t("sparql.run") }}
          </button>
          <span class="hint mono">⌘/Ctrl + Enter</span>
          <div class="spacer" />
          <label class="examples">
            <span class="sr-only">{{ t("sparql.loadExampleSr") }}</span>
            <select @change="loadExample(($event.target as HTMLSelectElement).value)">
              <option value="" disabled selected>{{ t("sparql.examplesPlaceholder") }}</option>
              <option v-for="ex in EXAMPLES" :key="ex.label" :value="ex.query">
                {{ ex.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="editor-pane">
          <SparqlEditor v-model="query" :aria-label="t('sparql.editorAria')" @run="run" />
        </div>

        <div class="results-pane">
          <div v-if="error" :class="['panel', 'error', needsLogin ? 'error--auth' : '']">
            <h2>{{ error.title }}</h2>
            <p>{{ error.message }}</p>
            <p v-if="error.code" class="code mono">{{ error.code }}</p>
            <div class="error__actions">
              <button v-if="needsLogin" class="btn primary" @click="auth.login('/sparql')">
                {{ t("sparql.signIn") }}
              </button>
              <a
                v-if="safeHref(error.docsUrl)"
                :href="safeHref(error.docsUrl)"
                target="_blank"
                rel="noopener"
                class="btn ghost"
              >
                {{ t("sparql.docs") }}
              </a>
            </div>
          </div>

          <template v-else-if="result">
            <SparqlResultsTable
              v-if="result.kind === 'table'"
              :vars="result.vars"
              :rows="result.rows"
            />
            <div v-else-if="result.kind === 'boolean'" class="panel boolean">
              <span class="boolean__value mono">{{ result.value }}</span>
              <span class="boolean__label">{{ t("sparql.askResult") }}</span>
            </div>
            <pre v-else class="turtle mono">{{ result.body }}</pre>
          </template>

          <p v-else class="placeholder">{{ t("sparql.placeholder") }}</p>
        </div>
      </div>

      <aside class="history">
        <div class="history__head">
          <h2>{{ t("sparql.historyHeading") }}</h2>
          <button v-if="history.entries.length" class="link" @click="history.clear()">
            {{ t("sparql.clear") }}
          </button>
        </div>
        <p v-if="!history.entries.length" class="history__empty">
          {{ t("sparql.historyEmpty") }}
        </p>
        <ul v-else class="history__list">
          <li v-for="entry in history.entries" :key="entry.id">
            <button class="history__item" @click="recall(entry.query)">
              <span class="history__time mono">{{ timeLabel(entry.at) }}</span>
              <span class="history__query mono">{{ entry.query }}</span>
            </button>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 32px 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--paper);
  min-height: 0;
}
.eyebrow {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 34px;
  color: var(--ink);
}
.lede {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 640px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
  flex: 1;
  min-height: 0;
}
.main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.spacer {
  flex: 1;
}
.hint {
  font-size: 11px;
  color: var(--muted);
}
.examples select {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
  color: var(--ink);
}
.editor-pane {
  height: 260px;
}
.results-pane {
  flex: 1;
  min-height: 160px;
}

.panel {
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
}
.error {
  border-color: var(--signal);
}
.error h2 {
  margin: 0 0 6px;
  font-family: var(--font-sans);
  font-size: 15px;
  color: var(--ink);
}
.error p {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--ink-2);
}
.error .code {
  font-size: 11px;
  color: var(--muted);
}
.error__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.boolean {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.boolean__value {
  font-size: 22px;
  color: var(--ink);
}
.boolean__label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.turtle {
  margin: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-2);
  overflow: auto;
  max-height: 100%;
  white-space: pre-wrap;
  word-break: break-word;
}
.placeholder {
  color: var(--muted);
  font-size: 13px;
  padding: 24px 4px;
}

.history {
  border-left: 1px solid var(--line);
  padding-left: 18px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.history__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.history__head h2 {
  margin: 0 0 10px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  font-weight: 500;
}
.link {
  background: none;
  border: 0;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.history__empty {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
.history__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
}
.history__item {
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.history__item:hover {
  border-color: var(--line-strong);
}
.history__time {
  font-size: 10px;
  color: var(--muted);
}
.history__query {
  font-size: 11px;
  color: var(--ink-2);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 1000px) {
  .page {
    padding: 24px 20px 32px;
  }
  .layout {
    grid-template-columns: 1fr;
  }
  .history {
    border-left: 0;
    padding-left: 0;
    border-top: 1px solid var(--line);
    padding-top: 16px;
  }
}
</style>
