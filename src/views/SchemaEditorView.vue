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
import { computed, ref } from "vue";
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
import AppIcon from "@/components/shared/AppIcon.vue";
import TurtleEditor from "@/components/shacl-editor/TurtleEditor.vue";
import ShaclCanvas from "@/components/shacl-editor/ShaclCanvas.vue";
import { shaclStatus } from "@/components/shacl-editor/status";
import { parseSchema } from "@/components/shacl-editor/parse";

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

// Live, non-destructive parse status for the Turtle source (does not reserialise).
const status = computed(() => shaclStatus(turtle.value));

const tab = ref<"shacl" | "visual">("shacl");

// The parsed model for the Visual Editor; null while the Turtle is invalid.
const docModel = computed(() => {
  try {
    return parseSchema(turtle.value);
  } catch {
    return null;
  }
});

async function copyTurtle() {
  try {
    await navigator.clipboard.writeText(turtle.value);
  } catch {
    /* clipboard unavailable (e.g. insecure context) — no-op */
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
  mutationFn: () => putSchema(slug.value.trim(), turtle.value),
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
  },
  onError: (e) => {
    error.value = parseFdpError(e);
    result.value = null;
  },
});

function onSave() {
  error.value = null;
  result.value = null;
  if (!slug.value.trim()) {
    error.value = clientError("Missing id", "Give the schema an id (slug).");
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
              <span class="schema__id">{{ s.id }}</span>
              <span v-if="s.targetClass" class="schema__tc mono">{{ s.targetClass }}</span>
              <span v-if="s.version != null" class="schema__v mono">v{{ s.version }}</span>
            </button>
          </li>
          <li v-if="!schemas.length" class="muted">No schemas yet.</li>
        </ul>
      </aside>

      <div class="editor">
        <label class="field">
          <span class="label">Id (slug)</span>
          <input v-model="slug" :disabled="slugLocked" placeholder="ontology" />
          <span class="help mono">/schemas/{{ slug || "…" }}</span>
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
          </button>
          <button
            class="tab"
            :class="{ active: tab === 'visual' }"
            role="tab"
            :aria-selected="tab === 'visual'"
            @click="tab = 'visual'"
          >
            <AppIcon name="tree" :size="13" /> Visual Editor
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
            v-if="savedId"
            class="btn ghost danger"
            :disabled="!auth.isAdmin || remove.isPending.value"
            @click="onDelete"
          >
            Delete
          </button>
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
          <p class="help">
            Overview of the shapes in this schema and how they link
            (<span class="mono">sh:node</span>/<span class="mono">sh:class</span>).
            Drag to arrange; edit shapes in the SHACL tab.
          </p>
          <ShaclCanvas v-if="docModel" :doc="docModel" />
          <p v-else class="srcerror mono">Fix the SHACL to see the shape graph.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 80px 48px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
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
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  color: var(--ink);
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
.tabpanel {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

@media (max-width: 900px) {
  .page {
    padding: 28px 24px 40px;
  }
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
