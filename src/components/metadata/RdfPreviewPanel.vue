<script setup lang="ts">
/**
 * "View as RDF" — serialization + graph views for the record on display.
 *
 * One component used by both the record sidecar and the repository hero, so the
 * box is consistent everywhere. Each format fetches the record through content
 * negotiation (`Accept:` header) — a plain link can't set Accept and the server
 * doesn't honour `?format=`.
 *
 * Interface notes #27/#28: rather than spawning a new browser tab, the chosen
 * view stretches out *inline* beneath the chips — the raw RDF in a scrollable
 * code block (with copy / download / open-in-tab actions), or a one-hop node
 * graph of the record. Clicking the active chip again collapses the panel.
 *
 * (No per-record "API" link: the OpenAPI spec documents no per-resource GET
 * operation to deep-link to, and the footer already links the OpenAPI UI.)
 *
 * `recordId` is the record's path id ("" for the repository root).
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { http } from "@/api/http";
import { apiBase } from "@/api/rdf";
import AppIcon from "@/components/shared/AppIcon.vue";
import RdfGraphOverlay from "./RdfGraphOverlay.vue";
import { highlightTurtle } from "./rdfHighlight";

const { t } = useI18n();

const props = withDefaults(defineProps<{ recordId?: string }>(), {
  recordId: "",
});

interface Format {
  key: string;
  label: string;
  accept: string;
  ext: string;
}

const FORMATS: Format[] = [
  { key: "turtle", label: "Turtle", accept: "text/turtle", ext: "ttl" },
  { key: "jsonld", label: "JSON-LD", accept: "application/ld+json", ext: "jsonld" },
  { key: "rdfxml", label: "RDF/XML", accept: "application/rdf+xml", ext: "rdf" },
  { key: "ntriples", label: "N-Triples", accept: "application/n-triples", ext: "nt" },
];

// The interactive graph opens in a full-screen overlay (the sidecar is too narrow);
// it fetches its own RDF, so the panel only tracks open/closed here.
const graphOpen = ref(false);

const open = ref(true);
/** Which serialization is stretched out below the chips ("turtle" | … | null). */
const active = ref<string | null>(null);
const busy = ref(false);
const errored = ref(false);
const copied = ref(false);

// Cache fetched payloads by Accept header so re-opening a view is instant.
const cache = new Map<string, string>();

const path = computed(() => (props.recordId ? `/${props.recordId}` : "/"));
// The repository root's subject is the bare PID base (`<http://…:8000>`, no
// trailing slash — that's how the server mints it). Appending "/" for the empty
// root recordId would yield `…:8000/`, which matches no triple in the root graph
// and collapses the RDF graph to a single node. Fall back to the bare base.
const subjectIri = computed(() => (props.recordId ? `${apiBase()}/${props.recordId}` : apiBase()));

const activeFormat = computed(() => FORMATS.find((f) => f.key === active.value) ?? null);
const content = computed(() =>
  activeFormat.value ? (cache.get(activeFormat.value.accept) ?? "") : "",
);

// Triple-syntax formats get inline syntax tinting; JSON-LD / RDF/XML render plain.
const TINTED = new Set(["turtle", "ntriples"]);
const tinted = computed(() => active.value !== null && TINTED.has(active.value));
const segments = computed(() => (tinted.value ? highlightTurtle(content.value) : []));

async function fetchAs(accept: string): Promise<string> {
  const hit = cache.get(accept);
  if (hit !== undefined) return hit;
  const res = await http.get<string>(path.value, {
    headers: { Accept: accept },
    responseType: "text",
    transformResponse: (d: unknown) => d,
  });
  cache.set(accept, res.data);
  return res.data;
}

async function select(key: string) {
  copied.value = false;
  if (active.value === key) {
    active.value = null; // toggle the open view closed
    return;
  }
  errored.value = false;
  const accept = FORMATS.find((f) => f.key === key)?.accept ?? "";
  busy.value = true;
  try {
    await fetchAs(accept);
    active.value = key;
  } catch {
    errored.value = true;
    active.value = null;
  } finally {
    busy.value = false;
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(content.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    /* clipboard blocked — no-op */
  }
}

function download() {
  const fmt = activeFormat.value;
  if (!fmt) return;
  const blob = new Blob([content.value], { type: fmt.accept });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${props.recordId || "repository"}.${fmt.ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function openTab() {
  const fmt = activeFormat.value;
  if (!fmt) return;
  const blob = new Blob([content.value], { type: fmt.accept });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// The RDF panel starts reduced: the format chips are shown but no serialization
// is expanded until the user picks one, so the sidecar stays compact by default.
</script>

<template>
  <section class="rdf">
    <button
      type="button"
      class="head"
      :aria-expanded="open"
      aria-controls="rdf-body"
      @click="open = !open"
    >
      <span class="label">{{ t("rdfPreview.heading") }}</span>
      <AppIcon :name="open ? 'chevron-d' : 'chevron-r'" :size="14" color="var(--muted)" />
    </button>

    <div v-if="open" id="rdf-body" class="body">
      <div class="chips" role="tablist" :aria-label="t('rdfPreview.viewsAria')">
        <button
          v-for="f in FORMATS"
          :key="f.key"
          type="button"
          role="tab"
          class="chip"
          :class="{ on: active === f.key }"
          :aria-selected="active === f.key"
          :disabled="busy"
          @click="select(f.key)"
        >
          {{ f.label }}
        </button>
        <button type="button" class="chip graph-chip" @click="graphOpen = true">
          <AppIcon name="graph" :size="13" />
          {{ t("rdfPreview.graph") }}
          <AppIcon name="arrow-up" :size="11" style="transform: rotate(45deg)" />
        </button>
      </div>

      <p v-if="busy" class="hint">{{ t("rdfPreview.loading") }}</p>
      <p v-else-if="errored" class="hint err">{{ t("rdfPreview.fetchError") }}</p>

      <!-- Inline reveal: the chosen serialization stretches out below the chips. -->
      <div v-if="activeFormat" class="panel">
        <div class="bar">
          <button type="button" class="mini" @click="copy">
            {{ copied ? t("rdfPreview.copied") : t("rdfPreview.copy") }}
          </button>
          <button type="button" class="mini" @click="download">
            <AppIcon name="download" :size="13" />
            {{ t("rdfPreview.save") }}
          </button>
          <button type="button" class="mini" @click="openTab">
            <AppIcon name="link" :size="13" />
            {{ t("rdfPreview.open") }}
          </button>
        </div>
        <pre class="code"><code v-if="tinted"><span
            v-for="(seg, i) in segments"
            :key="i"
            :class="seg.cls ? `tok-${seg.cls}` : undefined"
          >{{ seg.text }}</span></code><code v-else>{{ content }}</code></pre>
      </div>
    </div>

    <RdfGraphOverlay
      :open="graphOpen"
      :record-id="recordId"
      :subject-iri="subjectIri"
      @close="graphOpen = false"
    />
  </section>
</template>

<style scoped>
.rdf {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: var(--fair-text);
}
.label {
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-medium);
  font-size: var(--fair-text-sm);
  line-height: 1;
  color: var(--fair-text);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 9px;
  font-family: var(--fair-font-sans);
  font-size: var(--fair-text-xs);
  font-weight: var(--fair-weight-medium);
  color: var(--fair-text);
  background: var(--fair-surface);
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-pill);
  cursor: pointer;
}
.chip:hover:not(:disabled) {
  border-color: var(--fair-text-muted);
}
.chip.on {
  color: var(--fair-text-on-dark);
  background: var(--tool-accent);
  border-color: var(--tool-accent);
}
.chip:disabled {
  opacity: 0.55;
  cursor: default;
}
.graph-chip {
  margin-left: auto;
  color: var(--tool-accent);
  border-color: var(--fair-node-soft);
  background: var(--tool-accent-tint);
}
.graph-chip:hover {
  border-color: var(--tool-accent);
}
.panel {
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  background: var(--fair-code-bg);
  overflow: hidden;
}
.bar {
  display: flex;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid var(--fair-border);
  background: var(--fair-highlight);
}
.mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  font-family: var(--fair-font-sans);
  font-size: var(--fair-text-xs);
  color: var(--fair-text);
  background: var(--fair-surface);
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  cursor: pointer;
}
.mini:hover {
  border-color: var(--fair-text-muted);
}
.code {
  margin: 0;
  padding: 12px 14px;
  max-height: 320px;
  overflow: auto;
  font-family: var(--fair-font-mono);
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--fair-text);
  white-space: pre;
  tab-size: 2;
}
/* syntax tinting — kept subtle so the RDF reads as an authored artifact. */
.code .tok-cmt {
  color: var(--fair-text-light);
  font-style: italic;
}
.code .tok-iri {
  color: var(--tool-accent);
}
.code .tok-str {
  color: var(--fair-warning);
}
.code .tok-kw {
  color: var(--fair-node-darker);
  font-weight: 600;
}
.code .tok-pname {
  color: var(--fair-text-strong);
}
.panel:has(.graph) {
  padding: 12px;
}
.hint {
  margin: 0;
  font-size: var(--fair-text-xs);
  color: var(--fair-text-muted);
}
.hint.err {
  color: var(--fair-danger);
}
</style>
