<script setup lang="ts">
/**
 * Schema manager (client TASKS 9.5; server Phase 10.1; editor: Phase 19).
 *
 * Lists published SHACL shapes and hosts the visual schema editor (adopted from
 * the standalone "Contour" editor, Phase 19) for authoring them. Keeps the FDP
 * lifecycle: load a shape (`GET /schemas/{id}`), save (`PUT /schemas/{id}`),
 * test a sample record against the saved shape (`POST /schemas/{id}/validate`),
 * and delete. Turtle is the source of truth; `ContourEditor` round-trips it via
 * `loadTurtle`/`getTurtle`.
 */
import { computed, onMounted, ref } from "vue";
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
import { useResourceTypes } from "@/composables/useResourceTypes";
import { parseFdpError, type ParsedError } from "@/api/errors";
import { slugify } from "@/utils/slug";
import AppIcon from "@/components/shared/AppIcon.vue";
import ContourEditor from "@/components/shacl-editor/contour/ContourEditor.vue";

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

// Registered resource types → ghost nodes in the editor's graph overlay (19.8b):
// a hint that a type exists in the deployment even when no shape here targets it.
const { defs, specFor } = useResourceTypes();
const ghostTypes = computed(() =>
  defs.value.flatMap((d) => {
    const spec = specFor(d.urlPrefix);
    return spec && spec.classIri ? [{ classIri: spec.classIri, label: spec.label }] : [];
  }),
);

// The embedded editor owns the working model; the view drives it through the
// exposed loadTurtle/getTurtle and keeps the server lifecycle around it.
// (Typed explicitly: the component instance type widens to `any`, which would
// lose type-safety on these calls.)
type EditorHandle = { loadTurtle: (turtle: string) => string | null; getTurtle: () => string };
const editorRef = ref<EditorHandle | null>(null);

const slug = ref("");
const sample = ref("");
const savedId = ref<string | null>(null); // the id currently persisted (enables validate/delete)
const error = ref<ParsedError | null>(null);
const result = ref<SchemaValidation | null>(null);
const loadingShape = ref(false);

const slugLocked = computed(() => savedId.value !== null);

// The id the schema is created under: the user types freely, but we normalise
// to a URL-safe slug so ids stay consistent regardless of input.
const effectiveSlug = computed(() => slugify(slug.value));

// Protected shapes (the FDP root schema) report `deletable: false`: editing is
// allowed, deletion is not.
const currentSchema = computed(() => schemas.value.find((s) => s.id === savedId.value) ?? null);
const canDelete = computed(() => currentSchema.value?.deletable !== false);

function currentTurtle(): string {
  return editorRef.value?.getTurtle() ?? "";
}

function clientError(title: string, message: string): ParsedError {
  return {
    title,
    message,
    code: "client.validation",
    status: null,
    docsUrl: null,
    violations: [],
    fromServer: false,
  };
}

function startNew() {
  slug.value = "";
  sample.value = "";
  savedId.value = null;
  error.value = null;
  result.value = null;
  editorRef.value?.loadTurtle(STARTER);
}

async function load(id: string) {
  error.value = null;
  result.value = null;
  loadingShape.value = true;
  try {
    const ttl = await getSchemaTurtle(id);
    const parseErr = editorRef.value?.loadTurtle(ttl);
    if (parseErr) error.value = clientError("Couldn't parse shape", parseErr);
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
  // write back to its persisted id (never re-slugify a saved id).
  mutationFn: () => putSchema(savedId.value ?? effectiveSlug.value, currentTurtle()),
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
  if (!effectiveSlug.value) {
    error.value = clientError("Missing id", "Give the schema an ID (name).");
    return;
  }
  if (!currentTurtle().trim()) {
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

// Seed a starter shape once the editor is mounted.
onMounted(() => startNew());
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

        <p v-if="loadingShape" class="help">Loading…</p>
        <ContourEditor ref="editorRef" :violations="result?.violations ?? []" :ghost-types="ghostTypes" />

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
    </div>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 80px 48px;
  /* The authoring workbench (schema list + editor) needs room; use the browser
     width up to a generous cap rather than the narrow reading measure. */
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
