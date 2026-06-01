<script setup lang="ts">
/**
 * Resource-definition admin (client TASKS 9.6b; server ADR-0009).
 *
 * Admin-only surface to manage the deployment's metadata *types* at runtime.
 * Two-step model (Option A): a type points at a SHACL shape that must already
 * be published (the server rejects an unpublished `schema`), so this screen
 * registers/edits the *definition* — its URL prefix, name, shape IRI, and the
 * typed child links that place it in the hierarchy.
 *
 * The driving scenario — "Catalog now also contains Ontology metadata" — is a
 * child-link edit: open Catalog, add a child link targeting the new `ontology`
 * type. After any mutation the runtime catalog query is invalidated, so the
 * new type's endpoints/forms light up across the app without a reload.
 */
import { computed, reactive, ref } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth";
import {
  createResourceType,
  deleteResourceType,
  replaceResourceType,
  type ResourceTypeDef,
  type ResourceTypeInput,
} from "@/api/resourceDefinitions";
import {
  useResourceTypes,
  useInvalidateResourceTypes,
} from "@/composables/useResourceTypes";
import { useSchemas } from "@/composables/useSchemas";
import { parseFdpError, type ParsedError } from "@/api/errors";
import AppIcon from "@/components/shared/AppIcon.vue";

// Mirror the server's reserved first-path segments for fast client feedback.
const RESERVED = new Set([
  "healthz", "readyz", "info", "config", "labels", "me", "metrics", "data",
  "sparql", "settings", "forms", "spec", "expanded", "page", "resource-definitions",
  "schemas",
]);

const auth = useAuthStore();
const { defs, isLoading } = useResourceTypes();
const { schemas } = useSchemas();
const invalidate = useInvalidateResourceTypes();

interface ChildRow {
  relationUri: string;
  target: string;
  title: string;
}
interface FormState {
  editingSlug: string | null;
  urlPrefix: string;
  name: string;
  schema: string;
  children: ChildRow[];
}

const blankForm = (): FormState => ({
  editingSlug: null,
  urlPrefix: "",
  name: "",
  schema: "",
  children: [],
});

const form = reactive<FormState>(blankForm());
const showForm = ref(false);
const error = ref<ParsedError | null>(null);

const isEditing = computed(() => form.editingSlug !== null);
const prefixes = computed(() => defs.value.map((d) => d.urlPrefix).filter(Boolean));

function resetForm() {
  Object.assign(form, blankForm());
  error.value = null;
}

function startCreate() {
  resetForm();
  showForm.value = true;
}

function startEdit(def: ResourceTypeDef) {
  error.value = null;
  Object.assign(form, {
    editingSlug: def.slug,
    urlPrefix: def.urlPrefix,
    name: def.name,
    schema: def.schemaIri,
    children: def.children.map((c) => ({
      relationUri: c.relationUri,
      target: c.target,
      title: c.title,
    })),
  });
  showForm.value = true;
}

function addChild() {
  form.children.push({ relationUri: "", target: "", title: "" });
}
function removeChild(i: number) {
  form.children.splice(i, 1);
}

function clientError(title: string, message: string): ParsedError {
  return { title, message, code: "client.validation", status: null, docsUrl: null, violations: [], fromServer: false };
}

function validate(): ParsedError | null {
  if (!form.urlPrefix.trim()) return clientError("Missing prefix", "A URL prefix is required.");
  if (RESERVED.has(form.urlPrefix.trim()))
    return clientError("Reserved prefix", `"${form.urlPrefix}" is reserved by the server.`);
  if (!form.name.trim()) return clientError("Missing name", "A display name is required.");
  if (!form.schema.trim()) return clientError("Missing schema", "Point the type at a published SHACL shape IRI.");
  if (!isEditing.value && prefixes.value.includes(form.urlPrefix.trim()))
    return clientError("Already exists", `A type with prefix "${form.urlPrefix}" already exists.`);
  for (const c of form.children) {
    if (!c.relationUri.trim() || !c.target.trim())
      return clientError("Incomplete child link", "Each child link needs a relation IRI and a target type.");
  }
  return null;
}

function toInput(): ResourceTypeInput {
  return {
    urlPrefix: form.urlPrefix.trim(),
    name: form.name.trim(),
    schema: form.schema.trim(),
    children: form.children.map((c) => ({
      relationUri: c.relationUri.trim(),
      target: c.target.trim(),
      title: c.title.trim(),
    })),
  };
}

const save = useMutation({
  mutationFn: (input: ResourceTypeInput) =>
    form.editingSlug !== null
      ? replaceResourceType(form.editingSlug, input)
      : createResourceType(input),
  onSuccess: async () => {
    await invalidate();
    resetForm();
    showForm.value = false;
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

const del = useMutation({
  mutationFn: (slug: string) => deleteResourceType(slug),
  onSuccess: async () => {
    await invalidate();
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

function submit() {
  const v = validate();
  if (v) {
    error.value = v;
    return;
  }
  save.mutate(toInput());
}

function confirmDelete(def: ResourceTypeDef) {
  error.value = null;
  if (window.confirm(`Delete the "${def.name}" type? Records of this type are not removed.`)) {
    del.mutate(def.slug);
  }
}
</script>

<template>
  <section class="page">
    <div v-if="!auth.isAdmin" class="notice">
      <h2>Not allowed</h2>
      <p>Managing resource definitions requires the admin role.</p>
      <RouterLink to="/" class="btn ghost">Back to browse</RouterLink>
    </div>

    <template v-else>
      <header class="head">
        <div class="eyebrow mono">FDP Neo · Admin</div>
        <h1>Resource types</h1>
        <p class="lede">
          The metadata types this deployment exposes. Publish a SHACL shape first,
          then register a type that points at it; add a child link to place a type
          under another (e.g. let Catalog hold a new Ontology type).
        </p>
      </header>

      <div v-if="error" class="error">
        <strong>{{ error.title }}</strong>
        <p>{{ error.message }}</p>
        <ul v-if="error.violations.length" class="violations">
          <li v-for="(v, i) in error.violations" :key="i">
            <span v-if="v.path" class="mono">{{ v.path }}</span> {{ v.message }}
          </li>
        </ul>
      </div>

      <div class="toolbar">
        <button class="btn primary" :disabled="showForm && !isEditing" @click="startCreate">
          <AppIcon name="plus" :size="13" /> New type
        </button>
      </div>

      <div v-if="isLoading" class="notice">Loading types…</div>
      <ul v-else class="types">
        <li v-for="d in defs" :key="d.slug" class="type">
          <div class="type__main">
            <div class="type__title">
              {{ d.name }}
              <span class="chip mono">/{{ d.urlPrefix || "(root)" }}</span>
              <span v-if="d.isRoot" class="chip muted">root</span>
            </div>
            <div class="type__schema mono">{{ d.schemaIri }}</div>
            <div v-if="d.children.length" class="type__children">
              <span v-for="(c, i) in d.children" :key="i" class="chip soft mono">
                → {{ c.targetName || c.target }}
              </span>
            </div>
          </div>
          <div class="type__actions">
            <button class="btn sm" @click="startEdit(d)"><AppIcon name="edit" :size="12" /> Edit</button>
            <button v-if="!d.isRoot" class="btn sm danger" @click="confirmDelete(d)">
              <AppIcon name="x" :size="12" /> Delete
            </button>
          </div>
        </li>
      </ul>

      <form v-if="showForm" class="form" @submit.prevent="submit">
        <h2>{{ isEditing ? `Edit ${form.name}` : "New type" }}</h2>

        <label class="field">
          <span class="label">URL prefix</span>
          <input v-model="form.urlPrefix" :disabled="isEditing" placeholder="ontology" />
          <span class="help mono">/{{ form.urlPrefix || "…" }}</span>
        </label>
        <label class="field">
          <span class="label">Name</span>
          <input v-model="form.name" :disabled="isEditing" placeholder="Ontology" />
        </label>
        <label class="field">
          <span class="label">Schema (SHACL shape IRI)</span>
          <input
            v-model="form.schema"
            list="published-schemas"
            placeholder="pick a published shape, or paste an IRI"
          />
          <datalist id="published-schemas">
            <option v-for="s in schemas" :key="s.iri" :value="s.iri">
              {{ s.id }}{{ s.targetClass ? ` — ${s.targetClass}` : "" }}
            </option>
          </datalist>
          <span class="help">
            Must be a published SHACL shape — manage them in
            <RouterLink to="/schemas">Schemas</RouterLink>.
          </span>
        </label>

        <div class="children">
          <div class="children__head">
            <span class="label">Child links</span>
            <button type="button" class="btn sm" @click="addChild">
              <AppIcon name="plus" :size="12" /> Add child
            </button>
          </div>
          <p v-if="!form.children.length" class="help">No child links — this type holds no sub-types.</p>
          <div v-for="(c, i) in form.children" :key="i" class="child-row">
            <input v-model="c.relationUri" placeholder="relation IRI (e.g. http://www.w3.org/ns/dcat#dataset)" />
            <input v-model="c.target" list="rd-prefixes" placeholder="target prefix" />
            <input v-model="c.title" placeholder="title (optional)" />
            <button type="button" class="btn sm ghost" aria-label="Remove child link" @click="removeChild(i)">
              <AppIcon name="x" :size="12" />
            </button>
          </div>
          <datalist id="rd-prefixes">
            <option v-for="p in prefixes" :key="p" :value="p" />
          </datalist>
        </div>

        <div class="actions">
          <button class="btn primary" type="submit" :disabled="save.isPending.value">
            {{ save.isPending.value ? "Saving…" : isEditing ? "Save changes" : "Create type" }}
          </button>
          <button type="button" class="btn ghost" @click="resetForm(); showForm = false">Cancel</button>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 80px 48px;
  max-width: 860px;
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
.toolbar {
  margin: 24px 0 12px;
}
.types {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.type {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--paper);
}
.type__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 15px;
  color: var(--ink);
}
.type__schema {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
  word-break: break-all;
}
.type__children {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.type__actions {
  display: flex;
  gap: 8px;
  flex: none;
}
.chip {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  color: var(--ink-2);
}
.chip.muted {
  color: var(--muted);
}
.chip.soft {
  background: var(--surface-2);
  border-color: var(--line);
}
.form {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
}
.form h2 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 22px;
  color: var(--ink);
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
input {
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
input:disabled {
  background: var(--surface-2);
  color: var(--muted);
}
.help {
  font-size: 11px;
  color: var(--muted);
}
.children__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.child-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 8px;
  margin-top: 8px;
}
.actions {
  display: flex;
  gap: 10px;
}
.notice {
  padding: 40px 0;
  color: var(--muted);
}
.notice h2 {
  font-family: var(--font-serif);
  font-weight: 400;
  color: var(--ink);
  margin: 0 0 6px;
}
.error {
  border: 1px solid var(--signal);
  border-radius: var(--r-2);
  padding: 12px 14px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--ink-2);
}
.error strong {
  color: var(--ink);
}
.violations {
  margin: 8px 0 0;
  padding-left: 18px;
}
.btn.danger {
  color: var(--signal);
}
</style>
