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
import { http } from "@/api/http";
import { apiBase } from "@/api/rdf";
import AppIcon from "@/components/shared/AppIcon.vue";
import RdfGraphView from "./RdfGraphView.vue";

const props = withDefaults(defineProps<{ recordId?: string }>(), { recordId: "" });

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

// The graph view reuses the Turtle fetch (n3 parses it); no separate request.
const GRAPH_KEY = "graph";

const open = ref(true);
/** Which view is stretched out below the chips ("turtle" | … | "graph" | null). */
const active = ref<string | null>(null);
const busy = ref(false);
const errored = ref(false);
const copied = ref(false);

// Cache fetched payloads by Accept header so re-opening a view is instant.
const cache = new Map<string, string>();

const path = computed(() => (props.recordId ? `/${props.recordId}` : "/"));
const subjectIri = computed(() => `${apiBase()}/${props.recordId}`);

const activeFormat = computed(() => FORMATS.find((f) => f.key === active.value) ?? null);
const turtle = computed(() => cache.get("text/turtle") ?? "");
const content = computed(() =>
  activeFormat.value ? (cache.get(activeFormat.value.accept) ?? "") : "",
);

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
  // Graph and Turtle both ride on the Turtle payload.
  const accept = key === GRAPH_KEY ? "text/turtle" : (FORMATS.find((f) => f.key === key)?.accept ?? "");
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
      <span class="label">View as RDF</span>
      <AppIcon :name="open ? 'chevron-d' : 'chevron-r'" :size="14" color="var(--muted)" />
    </button>

    <div v-if="open" id="rdf-body" class="body">
      <div class="chips" role="tablist" aria-label="RDF views">
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
        <button
          type="button"
          role="tab"
          class="chip"
          :class="{ on: active === GRAPH_KEY }"
          :aria-selected="active === GRAPH_KEY"
          :disabled="busy"
          @click="select(GRAPH_KEY)"
        >
          <AppIcon name="graph" :size="13" />
          Graph
        </button>
      </div>

      <p v-if="busy" class="hint">Loading…</p>
      <p v-else-if="errored" class="hint err">Couldn't fetch the record.</p>

      <!-- Inline reveal: the chosen view stretches out below the chips. -->
      <div v-if="active === GRAPH_KEY" class="panel">
        <RdfGraphView :turtle="turtle" :subject-iri="subjectIri" />
      </div>
      <div v-else-if="activeFormat" class="panel">
        <div class="bar">
          <button type="button" class="mini" @click="copy">
            {{ copied ? "Copied" : "Copy" }}
          </button>
          <button type="button" class="mini" @click="download">
            <AppIcon name="download" :size="13" />
            Save
          </button>
          <button type="button" class="mini" @click="openTab">
            <AppIcon name="link" :size="13" />
            Open
          </button>
        </div>
        <pre class="code"><code>{{ content }}</code></pre>
      </div>
    </div>
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
  color: var(--ink-2);
}
.label {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 12px;
  line-height: 1;
  color: var(--ink-2);
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
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
}
.chip:hover:not(:disabled) {
  border-color: var(--ink-2);
}
.chip.on {
  color: var(--accent-ink, #fff);
  background: var(--accent, var(--ink-2));
  border-color: var(--accent, var(--ink-2));
}
.chip:disabled {
  opacity: 0.55;
  cursor: default;
}
.panel {
  border: 1px solid var(--line);
  border-radius: var(--r-2, 6px);
  background: var(--surface-2, var(--surface));
  overflow: hidden;
}
.bar {
  display: flex;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid var(--line);
}
.mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-2, 6px);
  cursor: pointer;
}
.mini:hover {
  border-color: var(--ink-2);
}
.code {
  margin: 0;
  padding: 10px;
  max-height: 320px;
  overflow: auto;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  line-height: 1.5;
  color: var(--ink-1, var(--ink-2));
  white-space: pre;
  tab-size: 2;
}
.panel:has(.graph) {
  padding: 12px;
}
.hint {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}
.hint.err {
  color: var(--danger, #b00);
}
</style>
