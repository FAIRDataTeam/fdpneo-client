<script setup lang="ts">
/**
 * The Contour visual SHACL editor, encapsulated for embedding in the FDP client.
 *
 * This is Contour's editor *body* (adapted from its `App.vue`): the visual
 * workbench (Palette · Canvas · Inspector), a live SHACL code tab (using the
 * client's Monaco `TurtleEditor`), a form preview, and the RDF graph overlay —
 * driven by Contour's module-level schema store. Contour's own app chrome
 * (file open/save, examples, recent, draft autosave, language menu) is
 * intentionally omitted: the FDP host (`SchemaEditorView`) owns the schema
 * lifecycle (list, load, save, delete) and the app owns locale.
 *
 * The host drives content through the exposed `load(turtle)` / `getTurtle()`.
 * Everything renders under a `.contour-editor` root so the vendored stylesheet
 * (scoped + token-bridged to the app theme) applies without leaking out.
 */
import { computed, ref, watch } from "vue";
import { useSchemaStore, fieldFromWidget } from "./composables/useSchema";
import { serializeSchema, parseShacl } from "./shacl";
import { parseRdf, shorten } from "./rdf";
import { validateSchema } from "./validation";
import { newId, DEFAULT_PREFIXES } from "./data";
import type { Prefix, Schema, SelectedKind, Widget } from "./types";
import { useI18n } from "./composables/useI18n";
import Palette from "./components/Palette.vue";
import Canvas from "./components/Canvas.vue";
import Inspector from "./components/Inspector.vue";
import FormPreview from "./components/FormPreview.vue";
import GraphView from "./components/GraphView.vue";
import Icon from "./components/Icon.vue";
import TurtleEditor from "@/components/shacl-editor/TurtleEditor.vue";
import "./editor.css";

const { t } = useI18n();
const { schema, mutate, load, undo, redo, canUndo, canRedo } = useSchemaStore();

/** Server sample-validation violations, surfaced onto the matching fields (19.8a). */
type ServerViolation = { resultPath?: string | null; focusNode?: string | null; message: string | null };
const props = defineProps<{
  violations?: ServerViolation[];
  /** Registered resource types → ghost nodes in the graph overlay (19.8b). */
  ghostTypes?: { classIri: string; label: string }[];
}>();

// Map each violation's `resultPath` (a full IRI) to the field(s) whose SHACL path
// it matches (by comparing the CURIE form), so the canvas can badge them.
const fieldViolations = computed<Record<string, string[]>>(() => {
  const out: Record<string, string[]> = {};
  const vs = props.violations ?? [];
  if (!vs.length) return out;
  const fields: { id: string; path: string }[] = [];
  for (const g of schema.groups) for (const f of g.fields) fields.push({ id: f.id, path: f.path });
  for (const ns of schema.nestedShapes ?? []) for (const f of ns.fields) fields.push({ id: f.id, path: f.path });
  for (const v of vs) {
    if (!v.resultPath || !v.message) continue;
    const curie = shorten(v.resultPath, schema.prefixes);
    for (const f of fields) {
      if (f.path && (f.path === curie || f.path === v.resultPath)) (out[f.id] ??= []).push(v.message);
    }
  }
  return out;
});

// The serializer emits terms in several namespaces the source may not have
// declared — the empty prefix `:` (minted group/shape IRIs), plus `rdfs:` (group
// labels), `dash:` (editor widgets), `sh:`/`xsd:` etc. A hand-written schema (or
// the FDP starter) that omits any of these would serialize to Turtle with an
// unbound prefix, which the server rejects ("Prefix '…' not bound"). Merge in any
// missing default prefix bindings on the way in (existing declarations win).
function ensureRequiredPrefixes(s: Schema): Schema {
  const have = new Set(s.prefixes.map((p) => p.prefix));
  const missing = DEFAULT_PREFIXES.filter((p) => !have.has(p.prefix)).map((p) => ({ ...p }));
  if (missing.length) s.prefixes = [...missing, ...s.prefixes];
  return s;
}

type Tab = "visual" | "definition" | "preview";
const tab = ref<Tab>("visual");

// ── Selection (drives the Inspector) ─────────────────────────────────────────
const selectedKind = ref<SelectedKind>("schema");
const selectedId = ref<string | null>(null);
const selectedNestedShapeId = ref<string | null>(null);

function selectField(id: string | null) {
  if (!id) return selectSchemaTarget();
  selectedKind.value = "field";
  selectedId.value = id;
  selectedNestedShapeId.value = null;
}
function selectGroup(id: string) {
  selectedKind.value = "group";
  selectedId.value = id;
  selectedNestedShapeId.value = null;
}
function selectSchemaTarget() {
  selectedKind.value = "schema";
  selectedId.value = null;
  selectedNestedShapeId.value = null;
}
function selectNestedShape(id: string) {
  selectedKind.value = "nested-shape";
  selectedId.value = null;
  selectedNestedShapeId.value = id;
}
function selectNestedField(nsId: string, fieldId: string) {
  selectedKind.value = "nested-field";
  selectedId.value = fieldId;
  selectedNestedShapeId.value = nsId;
}

// Click/keyboard alternative to dragging: add a widget to the most sensible
// target (the selected nested shape, the selected/last group, or a new one).
function addWidget(widget: Widget) {
  const kind = selectedKind.value;
  const selId = selectedId.value;
  const nsId = selectedNestedShapeId.value;
  let newFieldId: string | null = null;
  let nestedTarget: string | null = null;
  mutate((d) => {
    const f = fieldFromWidget(widget, 0);
    if ((kind === "nested-shape" || kind === "nested-field") && nsId) {
      const ns = (d.nestedShapes || []).find((x) => x.id === nsId);
      if (!ns) return;
      f.order = ns.fields.length;
      ns.fields.push(f);
      newFieldId = f.id;
      nestedTarget = nsId;
      return;
    }
    let g =
      (kind === "group" || kind === "field") && selId
        ? d.groups.find((x) => x.id === selId) ||
          d.groups.find((x) => x.fields.some((ff) => ff.id === selId))
        : undefined;
    if (!g) g = d.groups[d.groups.length - 1];
    if (!g) {
      const label = "Section 1";
      g = { id: newId("g"), iri: `:${label.replace(/\s+/g, "")}Group`, label, order: 0, fields: [] };
      d.groups.push(g);
    }
    f.order = g.fields.length;
    g.fields.push(f);
    newFieldId = f.id;
  });
  if (nestedTarget && newFieldId) selectNestedField(nestedTarget, newFieldId);
  else if (newFieldId) selectField(newFieldId);
}

// ── SHACL code tab (Monaco) ───────────────────────────────────────────────────
// The draft is refreshed from the model when the tab opens; user edits are
// parsed and, on success, loaded back into the store (so the visual/preview
// tabs reflect them). We only sync model→draft on tab entry, so there is no
// edit feedback loop.
const draft = ref("");
const shaclError = ref<string | null>(null);

watch(tab, (t) => {
  if (t === "definition") {
    draft.value = serializeSchema(schema, "turtle");
    shaclError.value = null;
  }
});

function onDraftChange(v: string) {
  draft.value = v;
  const { schema: parsed, error } = parseShacl(v);
  if (parsed) {
    shaclError.value = null;
    load(ensureRequiredPrefixes(parsed));
  } else {
    shaclError.value = error ?? "Could not parse the Turtle.";
  }
}

// ── Issues (client-side linter) ───────────────────────────────────────────────
const issues = computed(() => validateSchema(schema));
const errorCount = computed(() => issues.value.filter((i) => i.severity === "error").length);
const warningCount = computed(() => issues.value.filter((i) => i.severity === "warning").length);

// ── RDF graph overlay ─────────────────────────────────────────────────────────
const showGraph = ref(false);
const graphQuads = ref<ReturnType<typeof parseRdf>["quads"]>([]);
const graphPrefixes = ref<Prefix[]>([]);
function openGraph() {
  const parsed = parseRdf(serializeSchema(schema, "turtle"), "turtle");
  graphQuads.value = parsed.quads;
  graphPrefixes.value = parsed.prefixes;
  showGraph.value = true;
}

// ── Host API ──────────────────────────────────────────────────────────────────
/** Load a Turtle document into the editor (replaces the current schema). */
function loadTurtle(turtle: string): string | null {
  const { schema: parsed, error } = parseShacl(turtle);
  if (parsed) {
    load(ensureRequiredPrefixes(parsed));
    selectSchemaTarget();
    if (tab.value === "definition") draft.value = serializeSchema(schema, "turtle");
    return null;
  }
  return error ?? "Could not parse the Turtle.";
}
/** Serialize the current schema to Turtle (for the host to persist). */
function getTurtle(): string {
  return serializeSchema(schema, "turtle");
}

defineExpose({ loadTurtle, getTurtle });
</script>

<template>
  <div class="contour-editor">
    <div class="ce-tabs" role="tablist">
      <button
        class="ce-tab"
        :class="{ active: tab === 'visual' }"
        role="tab"
        :aria-selected="tab === 'visual'"
        @click="tab = 'visual'"
      >
        <Icon name="wand" :size="14" /> {{ t("tabs.visualEditor") }}
      </button>
      <button
        class="ce-tab"
        :class="{ active: tab === 'definition' }"
        role="tab"
        :aria-selected="tab === 'definition'"
        @click="tab = 'definition'"
      >
        <Icon name="code" :size="14" /> {{ t("tabs.definition") }}
      </button>
      <button
        class="ce-tab"
        :class="{ active: tab === 'preview' }"
        role="tab"
        :aria-selected="tab === 'preview'"
        @click="tab = 'preview'"
      >
        <Icon name="eye" :size="14" /> {{ t("tabs.formPreview") }}
      </button>
      <div class="ce-tabs__spacer" />
      <button class="btn btn-ghost btn-sm" :disabled="!canUndo" :title="t('header.undoTitle')" @click="undo">
        <Icon name="undo" :size="14" />
      </button>
      <button class="btn btn-ghost btn-sm" :disabled="!canRedo" :title="t('header.redoTitle')" @click="redo">
        <Icon name="redo" :size="14" />
      </button>
      <button class="btn btn-ghost btn-sm" :title="t('graph.openTitle')" @click="openGraph">
        <Icon name="layers" :size="14" /> {{ t("graph.open") }}
      </button>
    </div>

    <template v-if="tab === 'visual'">
      <div class="workbench">
        <Palette @add="addWidget" />
        <Canvas
          :schema="schema"
          :mutate="mutate"
          :field-violations="fieldViolations"
          :selected-kind="selectedKind"
          :selected-id="selectedId"
          :selected-nested-shape-id="selectedNestedShapeId"
          @select-field="selectField"
          @select-group="selectGroup"
          @select-schema="selectSchemaTarget"
          @select-nested-shape="selectNestedShape"
          @select-nested-field="selectNestedField"
        />
        <Inspector
          :schema="schema"
          :mutate="mutate"
          :selected-kind="selectedKind"
          :selected-id="selectedId"
          :selected-nested-shape-id="selectedNestedShapeId"
          @clear="selectSchemaTarget"
        />
      </div>
    </template>

    <template v-else-if="tab === 'definition'">
      <div class="ce-code">
        <p v-if="shaclError" class="ce-code__error" role="alert">{{ shaclError }}</p>
        <TurtleEditor
          :model-value="draft"
          :aria-label="t('tabs.definition')"
          class="ce-code__editor"
          @update:model-value="onDraftChange"
        />
      </div>
    </template>

    <template v-else>
      <div class="ce-preview">
        <FormPreview :schema="schema" />
      </div>
    </template>

    <GraphView
      v-if="showGraph"
      :quads="graphQuads"
      :prefixes="graphPrefixes"
      :ghost-types="props.ghostTypes ?? []"
      @close="showGraph = false"
    />

    <div v-if="errorCount > 0 || warningCount > 0" class="ce-issues" role="status">
      <Icon name="warning" :size="12" />
      {{ t("issues.summary", { errors: errorCount, warnings: warningCount }) }}
    </div>
  </div>
</template>

<style scoped>
.ce-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.ce-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 0;
  background: transparent;
  border-radius: var(--r-1);
  font: inherit;
  font-size: 13px;
  color: var(--muted);
  cursor: pointer;
}
.ce-tab.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.ce-tabs__spacer {
  flex: 1;
}
.workbench {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 320px;
  gap: 0;
  min-height: 480px;
}
.ce-code {
  padding: 12px;
}
.ce-code__error {
  margin: 0 0 8px;
  padding: 8px 12px;
  border-radius: var(--r-2);
  background: var(--signal-soft);
  color: var(--signal);
  font-size: 13px;
}
.ce-code__editor {
  height: 60vh;
  min-height: 360px;
}
.ce-preview {
  padding: 20px;
}
.ce-issues {
  padding: 8px 12px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--signal);
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
