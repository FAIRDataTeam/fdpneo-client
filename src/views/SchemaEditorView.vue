<script setup lang="ts">
/**
 * Schema manager (client TASKS 9.5; server Phase 10.1).
 *
 * Lists published SHACL shapes and lets an admin author them as Turtle, save
 * (`PUT /schemas/{id}`), test a sample record against a saved shape
 * (`POST /schemas/{id}/validate`), and delete. This is the lifecycle surface
 * that makes the two-step flow guided: publish a shape here, then point a
 * resource definition at it in the type admin.
 *
 * Intentionally a text-first editor — the visual node-based SHACL canvas
 * (Phase 4) is separate, still future work. Turtle is the source of truth
 * either way, so this stays compatible with a later visual layer.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth";
import {
  deleteSchema,
  getSchemaTurtle,
  putSchema,
  validateSample,
  type SchemaValidation,
} from "@/api/schemas";
import { useSchemas, useInvalidateSchemas } from "@/composables/useSchemas";
import { parseFdpError, type ParsedError } from "@/api/errors";
import { slugify } from "@/utils/slug";
import AppIcon from "@/components/shared/AppIcon.vue";
import TurtleEditor from "@/components/shacl-editor/TurtleEditor.vue";
import ShaclCanvas from "@/components/shacl-editor/ShaclCanvas.vue";
import FormDesigner from "@/components/shacl-editor/FormDesigner.vue";
import ShaclFormPreview from "@/components/shacl-editor/ShaclFormPreview.vue";
import { shaclStatus, tidyTurtle } from "@/components/shacl-editor/status";
import { parseSchema } from "@/components/shacl-editor/parse";
import { serializeSchema } from "@/components/shacl-editor/serialize";
import type { SchemaDocument } from "@/components/shacl-editor/model";
import { useShaclEditorStore } from "@/stores/shaclEditor";

const STARTER = `@prefix sh:   <http://www.w3.org/ns/shacl#> .
@prefix dct:  <http://purl.org/dc/terms/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .

# Edit me: a NodeShape targeting the class your records will be typed as.
[] a sh:NodeShape ;
   sh:targetClass owl:Ontology ;
   sh:property [ sh:path dct:title ; sh:minCount 1 ; sh:datatype xsd:string ] .
`;

const auth = useAuthStore();
const { schemas, isLoading } = useSchemas();
const invalidate = useInvalidateSchemas();

const slug = ref("");
const turtle = ref("");
const sample = ref("");
const savedId = ref<string | null>(null); // the id currently persisted (enables validate/delete)
const error = ref<ParsedError | null>(null);
const result = ref<SchemaValidation | null>(null);
const loadingShape = ref(false);

const slugLocked = computed(() => savedId.value !== null);

// The id the schema is actually created under: the user types freely, but we
// normalise to a URL-safe slug so ids stay consistent regardless of input. The
// help text under the field previews this, so what-you-see is what's stored.
const effectiveSlug = computed(() => slugify(slug.value));

// Protected shapes (the FDP root schema) report `deletable: false` from the
// list: editing is allowed, deletion is not. Resolve the flag for the schema
// currently loaded so the Delete action can be suppressed.
const currentSchema = computed(() => schemas.value.find((s) => s.id === savedId.value) ?? null);
const canDelete = computed(() => currentSchema.value?.deletable !== false);

// Live, non-destructive parse status for the Turtle source (does not reserialise).
const status = computed(() => shaclStatus(turtle.value));

const editorStore = useShaclEditorStore();
const tab = ref<"shacl" | "visual" | "preview">("shacl");
const previewShapeIri = ref<string | null>(null);

// Working model for the Visual Editor: parsed once when the tab opens, then
// mutated in place (client ids stay stable, so field selection survives edits)
// and serialised straight back to the Turtle — never reparsed per keystroke.
const model = ref<SchemaDocument | null>(null);

function safeParse(t: string): SchemaDocument | null {
  try {
    return parseSchema(t);
  } catch {
    return null;
  }
}

watch(tab, (t) => {
  // Both visual surfaces read a freshly-parsed model from the Turtle.
  if (t === "visual" || t === "preview") model.value = safeParse(turtle.value);
  if (t === "visual") {
    editorStore.select(null); // start on the shape graph, not a drill-in
    editorStore.resetHistory(); // undo/redo is per editing session
  }
});

function onDocChange(next: SchemaDocument) {
  if (model.value) editorStore.record(model.value); // snapshot the pre-edit doc
  model.value = next;
  turtle.value = serializeSchema(next);
}

function undo() {
  if (!model.value) return;
  const prev = editorStore.undo(model.value);
  if (prev) {
    model.value = prev;
    turtle.value = serializeSchema(prev);
  }
}
function redo() {
  if (!model.value) return;
  const next = editorStore.redo(model.value);
  if (next) {
    model.value = next;
    turtle.value = serializeSchema(next);
  }
}

// Cmd/Ctrl+Z / +Shift+Z drive undo/redo while on the Visual Editor tab (the
// SHACL tab has Monaco's own undo, so we stay out of its way).
function onKeydown(e: KeyboardEvent) {
  if (tab.value !== "visual" || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
  e.preventDefault();
  if (e.shiftKey) redo();
  else undo();
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

// Any edit to the Turtle invalidates a prior sample-validation run.
watch(turtle, () => editorStore.clearViolations());

// Drill-in target: the shape selected in the graph, by stable shapeIri.
const selectedShape = computed(
  () => model.value?.shapes.find((s) => s.shapeIri === editorStore.selectedIri) ?? null,
);

// The shape rendered in Form Preview (a picker when there are several).
const previewShape = computed(() => {
  const shapes = model.value?.shapes ?? [];
  return shapes.find((s) => s.shapeIri === previewShapeIri.value) ?? shapes[0] ?? null;
});

async function copyTurtle() {
  try {
    await navigator.clipboard.writeText(turtle.value);
  } catch {
    /* clipboard unavailable (e.g. insecure context) — no-op */
  }
}

// Tidy: lossless pretty-print of the current Turtle (preserves every triple).
const tidying = ref(false);
async function tidy() {
  tidying.value = true;
  try {
    turtle.value = await tidyTurtle(turtle.value);
  } catch {
    /* invalid Turtle — the status pill already flags it */
  } finally {
    tidying.value = false;
  }
}

function clientError(title: string, message: string): ParsedError {
  return { title, message, code: "client.validation", status: null, docsUrl: null, violations: [], fromServer: false };
}

function startNew() {
  slug.value = "";
  turtle.value = STARTER;
  sample.value = "";
  savedId.value = null;
  error.value = null;
  result.value = null;
}

async function load(id: string) {
  error.value = null;
  result.value = null;
  loadingShape.value = true;
  try {
    turtle.value = await getSchemaTurtle(id);
    slug.value = id;
    savedId.value = id;
  } catch (e) {
    error.value = parseFdpError(e);
  } finally {
    loadingShape.value = false;
  }
}

const save = useMutation({
  // Create: write under the normalised slug. Re-save of an existing schema:
  // write back to its persisted id (never re-slugify a saved id, which could
  // fork a legacy non-slug id into a new resource).
  mutationFn: () => putSchema(savedId.value ?? effectiveSlug.value, turtle.value),
  onSuccess: async (info) => {
    savedId.value = info.id;
    error.value = null;
    await invalidate();
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

const remove = useMutation({
  mutationFn: (id: string) => deleteSchema(id),
  onSuccess: async () => {
    await invalidate();
    startNew();
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

const preview = useMutation({
  mutationFn: () => validateSample(savedId.value as string, sample.value),
  onSuccess: (r) => {
    result.value = r;
    error.value = null;
    // Surface violations as canvas annotations in the Visual Editor (4.4).
    editorStore.setViolations(r.violations);
  },
  onError: (e) => {
    error.value = parseFdpError(e);
    result.value = null;
  },
});

function onSave() {
  error.value = null;
  result.value = null;
  if (!effectiveSlug.value) {
    error.value = clientError("Missing id", "Give the schema an ID (name).");
    return;
  }
  if (!turtle.value.trim()) {
    error.value = clientError("Empty shape", "The shape body can't be empty.");
    return;
  }
  save.mutate();
}

function onDelete() {
  if (savedId.value && window.confirm(`Delete schema "${savedId.value}"?`)) {
    remove.mutate(savedId.value);
  }
}
</script>

<template>
  <section class="page">
    <header class="head">
      <div class="eyebrow mono">FDP Neo · Admin</div>
      <h1>Schemas</h1>
      <p class="lede">
        Publish the SHACL shapes that validate records. Save a shape here, then
        point a resource type at it in
        <RouterLink to="/admin/resource-definitions">resource types</RouterLink>.
      </p>
    </header>

    <div v-if="!auth.isAdmin" class="notice">
      <p>Viewing is open; publishing or deleting schemas requires the admin role.</p>
    </div>

    <div v-if="error" class="error">
      <strong>{{ error.title }}</strong>
      <p>{{ error.message }}</p>
      <ul v-if="error.violations.length" class="violations">
        <li v-for="(v, i) in error.violations" :key="i">
          <span v-if="v.path" class="mono">{{ v.path }}</span> {{ v.message }}
        </li>
      </ul>
    </div>

    <div class="layout">
      <aside class="list">
        <div class="list__head">
          <span class="label">Published</span>
          <button class="btn sm" @click="startNew"><AppIcon name="plus" :size="12" /> New</button>
        </div>
        <div v-if="isLoading" class="muted">Loading…</div>
        <ul v-else class="schemas">
          <li v-for="s in schemas" :key="s.id">
            <button class="schema" :class="{ active: s.id === savedId }" @click="load(s.id)">
              <span class="schema__id">
                {{ s.id }}
                <AppIcon
                  v-if="!s.deletable"
                  name="lock"
                  :size="11"
                  class="schema__lock"
                  aria-label="Protected — can't be deleted"
                />
              </span>
              <span v-if="s.targetClass" class="schema__tc mono">{{ s.targetClass }}</span>
              <span v-if="s.version != null" class="schema__v mono">v{{ s.version }}</span>
            </button>
          </li>
          <li v-if="!schemas.length" class="muted">No schemas yet.</li>
        </ul>
      </aside>

      <div class="editor">
        <label class="field">
          <span class="label">Schema ID (name)</span>
          <input v-model="slug" :disabled="slugLocked" placeholder="ontology" />
          <span class="help mono">/schemas/{{ effectiveSlug || "…" }}</span>
        </label>

        <div class="tabs" role="tablist">
          <button
            class="tab"
            :class="{ active: tab === 'shacl' }"
            role="tab"
            :aria-selected="tab === 'shacl'"
            @click="tab = 'shacl'"
          >
            <AppIcon name="code" :size="13" /> SHACL
            <span v-if="!status.ok" class="dot" title="The Turtle doesn't parse" aria-label="parse error"></span>
          </button>
          <button
            class="tab"
            :class="{ active: tab === 'visual' }"
            role="tab"
            :aria-selected="tab === 'visual'"
            @click="tab = 'visual'"
          >
            <AppIcon name="tree" :size="13" /> Visual Editor
            <span class="new-pill">NEW</span>
          </button>
          <button
            class="tab"
            :class="{ active: tab === 'preview' }"
            role="tab"
            :aria-selected="tab === 'preview'"
            @click="tab = 'preview'"
          >
            <AppIcon name="eye" :size="13" /> Form Preview
          </button>
        </div>

        <div v-show="tab === 'shacl'" class="tabpanel">
        <div class="field">
          <div class="field__head">
            <span class="label">Shape (Turtle)</span>
            <div class="srcactions">
              <span class="pill" :class="status.ok ? 'ok' : 'bad'" role="status">
                <template v-if="status.ok">
                  ✓ {{ status.shapes }} shape{{ status.shapes === 1 ? "" : "s" }} ·
                  {{ status.properties }} propert{{ status.properties === 1 ? "y" : "ies" }}
                </template>
                <template v-else>✕ Invalid SHACL</template>
              </span>
              <button
                type="button"
                class="btn sm"
                :disabled="!status.ok || tidying"
                title="Reformat the Turtle (lossless)"
                @click="tidy"
              >
                {{ tidying ? "Tidying…" : "Tidy" }}
              </button>
              <button type="button" class="btn sm" @click="copyTurtle">
                <AppIcon name="code" :size="12" /> Copy
              </button>
            </div>
          </div>
          <TurtleEditor v-model="turtle" aria-label="Shape (Turtle)" class="srceditor" />
          <p v-if="loadingShape" class="help">Loading…</p>
          <p v-else-if="!status.ok && status.error" class="srcerror mono">
            {{ status.error }} — the last valid version is kept until this is fixed.
          </p>
        </div>

        <div class="actions">
          <button
            class="btn primary"
            :disabled="!auth.isAdmin || save.isPending.value"
            @click="onSave"
          >
            {{ save.isPending.value ? "Saving…" : savedId ? "Save new version" : "Publish schema" }}
          </button>
          <button
            v-if="savedId && canDelete"
            class="btn ghost danger"
            :disabled="!auth.isAdmin || remove.isPending.value"
            @click="onDelete"
          >
            Delete
          </button>
          <span v-else-if="savedId && !canDelete" class="protected">
            <AppIcon name="lock" :size="13" />
            Protected — the FDP root schema can't be deleted (editing is allowed).
          </span>
        </div>

        <div class="testbed">
          <span class="label">Test a sample record</span>
          <p class="help">Validate a sample (Turtle) against the <em>saved</em> shape.</p>
          <textarea
            v-model="sample"
            spellcheck="false"
            rows="6"
            placeholder="<urn:example> a owl:Ontology ; dct:title &quot;Gene Ontology&quot; ."
            :disabled="!savedId"
          />
          <div class="actions">
            <button
              class="btn sm"
              :disabled="!savedId || !sample.trim() || preview.isPending.value"
              @click="preview.mutate()"
            >
              {{ preview.isPending.value ? "Validating…" : "Validate sample" }}
            </button>
            <span v-if="!savedId" class="help">Save the shape first.</span>
          </div>
          <div v-if="result" class="result" :class="result.conforms ? 'ok' : 'bad'">
            <strong>{{ result.conforms ? "Conforms ✓" : "Does not conform" }}</strong>
            <ul v-if="result.violations.length" class="violations">
              <li v-for="(v, i) in result.violations" :key="i">
                <span v-if="v.resultPath" class="mono">{{ v.resultPath }}</span>
                {{ v.message }}
                <span v-if="v.focusNode" class="mono muted"> @ {{ v.focusNode }}</span>
              </li>
            </ul>
          </div>
        </div>
        </div>

        <div v-show="tab === 'visual'" class="tabpanel">
          <div class="vtoolbar">
            <button class="btn sm" :disabled="!editorStore.canUndo" title="Undo (Cmd/Ctrl+Z)" @click="undo">
              ↶ Undo
            </button>
            <button class="btn sm" :disabled="!editorStore.canRedo" title="Redo (Cmd/Ctrl+Shift+Z)" @click="redo">
              ↷ Redo
            </button>
          </div>
          <template v-if="model">
            <FormDesigner
              v-if="selectedShape"
              :doc="model"
              :shape-id="selectedShape.id"
              @update:doc="onDocChange"
              @back="editorStore.select(null)"
            />
            <template v-else>
              <p class="help">
                Shapes in this schema and how they link
                (<span class="mono">sh:node</span>/<span class="mono">sh:class</span>).
                Click a shape to edit its form; drag to arrange.
              </p>
              <ShaclCanvas :doc="model" />
            </template>
          </template>
          <p v-else class="srcerror mono">Fix the SHACL to see the shape graph.</p>
        </div>

        <div v-show="tab === 'preview'" class="tabpanel">
          <template v-if="previewShape">
            <p class="help">
              Data-entry form a curator would use to populate a record of type
              <span class="mono">{{ previewShape.targetClass || "(no target class)" }}</span>.
              Generated live from the schema; test values are throwaway.
            </p>
            <label v-if="(model?.shapes.length ?? 0) > 1" class="field">
              <span class="label">Preview shape</span>
              <select v-model="previewShapeIri">
                <option v-for="s in model?.shapes ?? []" :key="s.id" :value="s.shapeIri">
                  {{ s.label || s.shapeIri }}
                </option>
              </select>
            </label>
            <ShaclFormPreview :shape="previewShape" :prefixes="model?.prefixes ?? []" />
          </template>
          <p v-else class="srcerror mono">Fix the SHACL to preview the form.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 80px 48px;
  /* The authoring workbench (schema list + Monaco + visual canvas) needs room;
     use the browser width up to a generous cap rather than the narrow reading
     measure used elsewhere. */
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
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
  font-size: 32px;
  color: var(--ink);
}
.lede {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-2);
  max-width: 640px;
}
.layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 28px;
  margin-top: 24px;
}
.list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.schemas {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.schema {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--paper);
  cursor: pointer;
}
.schema.active {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}
.schema__id {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  color: var(--ink);
}
.schema__lock {
  color: var(--muted);
  flex: none;
}
.schema__tc {
  font-size: 10px;
  color: var(--muted);
  word-break: break-all;
}
.schema__v {
  font-size: 10px;
  color: var(--muted-2);
}
.editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
input,
textarea {
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
}
textarea {
  font-family: var(--font-mono, monospace);
  font-size: 12.5px;
  line-height: 1.5;
  resize: vertical;
}
input:disabled,
textarea:disabled {
  background: var(--surface-2);
  color: var(--muted);
}
.help {
  font-size: 11px;
  color: var(--muted);
}
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--line);
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--signal);
}
.new-pill {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--warn);
  background: var(--warn-soft);
  padding: 1px 5px;
  border-radius: var(--r-3);
}
.tabpanel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.vtoolbar {
  display: flex;
  gap: 8px;
}
.field__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.srcactions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--r-1);
  white-space: nowrap;
}
.pill.ok {
  color: var(--ok);
  background: var(--ok-soft);
}
.pill.bad {
  color: var(--signal);
  background: var(--signal-soft);
}
.srceditor {
  height: 380px;
}
.srcerror {
  font-size: 12px;
  color: var(--signal);
  background: var(--signal-soft);
  border-radius: var(--r-1);
  padding: 8px 10px;
  margin: 0;
}
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.testbed {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.notice {
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 14px;
}
.error {
  border: 1px solid var(--signal);
  border-radius: var(--r-2);
  padding: 12px 14px;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--ink-2);
}
.error strong {
  color: var(--ink);
}
.result {
  border-radius: var(--r-2);
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid var(--line);
}
.result.bad {
  border-color: var(--signal);
}
.violations {
  margin: 8px 0 0;
  padding-left: 18px;
}
.muted {
  color: var(--muted);
  font-size: 12px;
}
.btn.danger {
  color: var(--signal);
}
.protected {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 900px) {
  .page {
    padding: 28px 24px 40px;
  }
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
