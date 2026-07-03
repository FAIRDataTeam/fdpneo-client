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
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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
  if (!form.urlPrefix.trim())
    return clientError(t("resourceDefsAdmin.errMissingPrefixTitle"), t("resourceDefsAdmin.errMissingPrefixMsg"));
  if (RESERVED.has(form.urlPrefix.trim()))
    return clientError(
      t("resourceDefsAdmin.errReservedPrefixTitle"),
      t("resourceDefsAdmin.errReservedPrefixMsg", { prefix: form.urlPrefix }),
    );
  if (!form.name.trim())
    return clientError(t("resourceDefsAdmin.errMissingNameTitle"), t("resourceDefsAdmin.errMissingNameMsg"));
  if (!form.schema.trim())
    return clientError(t("resourceDefsAdmin.errMissingSchemaTitle"), t("resourceDefsAdmin.errMissingSchemaMsg"));
  if (!isEditing.value && prefixes.value.includes(form.urlPrefix.trim()))
    return clientError(
      t("resourceDefsAdmin.errAlreadyExistsTitle"),
      t("resourceDefsAdmin.errAlreadyExistsMsg", { prefix: form.urlPrefix }),
    );
  for (const c of form.children) {
    if (!c.relationUri.trim() || !c.target.trim())
      return clientError(t("resourceDefsAdmin.errIncompleteChildTitle"), t("resourceDefsAdmin.errIncompleteChildMsg"));
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
  if (window.confirm(t("resourceDefsAdmin.deleteConfirm", { name: def.name }))) {
    del.mutate(def.slug);
  }
}
</script>

<template>
  <section class="page">
    <div v-if="!auth.isAdmin" class="notice">
      <h2>{{ t("resourceDefsAdmin.adminOnlyTitle") }}</h2>
      <p>{{ t("resourceDefsAdmin.adminOnlyMsg") }}</p>
      <RouterLink to="/" class="btn ghost">{{ t("resourceDefsAdmin.backToBrowse") }}</RouterLink>
    </div>

    <template v-else>
      <header class="head">
        <div class="eyebrow mono">{{ t("resourceDefsAdmin.eyebrow") }}</div>
        <h1>{{ t("resourceDefsAdmin.heading") }}</h1>
        <p class="lede">
          {{ t("resourceDefsAdmin.lede") }}
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
          <AppIcon name="plus" :size="13" /> {{ t("resourceDefsAdmin.newType") }}
        </button>
      </div>

      <div v-if="isLoading" class="notice">{{ t("resourceDefsAdmin.loadingTypes") }}</div>
      <ul v-else class="types">
        <li v-for="d in defs" :key="d.slug" class="type">
          <div class="type__main">
            <div class="type__title">
              {{ d.name }}
              <span class="chip mono">/{{ d.urlPrefix || t("resourceDefsAdmin.rootPrefix") }}</span>
              <span v-if="d.isRoot" class="chip muted">{{ t("resourceDefsAdmin.root") }}</span>
            </div>
            <div class="type__schema mono">{{ d.schemaIri }}</div>
            <div v-if="d.children.length" class="type__children">
              <span v-for="(c, i) in d.children" :key="i" class="chip soft mono">
                → {{ c.targetName || c.target }}
              </span>
            </div>
          </div>
          <div class="type__actions">
            <button class="btn sm" @click="startEdit(d)"><AppIcon name="edit" :size="12" /> {{ t("resourceDefsAdmin.edit") }}</button>
            <button v-if="!d.isRoot" class="btn sm danger" @click="confirmDelete(d)">
              <AppIcon name="x" :size="12" /> {{ t("resourceDefsAdmin.delete") }}
            </button>
          </div>
        </li>
      </ul>

      <form v-if="showForm" class="form" @submit.prevent="submit">
        <h2>{{ isEditing ? t("resourceDefsAdmin.editHeading", { name: form.name }) : t("resourceDefsAdmin.newType") }}</h2>

        <label class="field">
          <span class="label">{{ t("resourceDefsAdmin.urlPrefixLabel") }}</span>
          <input v-model="form.urlPrefix" :disabled="isEditing" :placeholder="t('resourceDefsAdmin.urlPrefixPlaceholder')" />
          <span class="help mono">/{{ form.urlPrefix || "…" }}</span>
        </label>
        <label class="field">
          <span class="label">{{ t("resourceDefsAdmin.nameLabel") }}</span>
          <input v-model="form.name" :disabled="isEditing" :placeholder="t('resourceDefsAdmin.namePlaceholder')" />
        </label>
        <label class="field">
          <span class="label">{{ t("resourceDefsAdmin.schemaLabel") }}</span>
          <input
            v-model="form.schema"
            list="published-schemas"
            :placeholder="t('resourceDefsAdmin.schemaPlaceholder')"
          />
          <datalist id="published-schemas">
            <option v-for="s in schemas" :key="s.iri" :value="s.iri">
              {{ s.id }}{{ s.targetClass ? ` — ${s.targetClass}` : "" }}
            </option>
          </datalist>
          <span class="help">
            {{ t("resourceDefsAdmin.schemaHelpPre") }}
            <RouterLink to="/schemas">{{ t("resourceDefsAdmin.schemaHelpLink") }}</RouterLink>.
          </span>
        </label>

        <div class="children">
          <div class="children__head">
            <span class="label">{{ t("resourceDefsAdmin.childLinks") }}</span>
            <button type="button" class="btn sm" @click="addChild">
              <AppIcon name="plus" :size="12" /> {{ t("resourceDefsAdmin.addChild") }}
            </button>
          </div>
          <p v-if="!form.children.length" class="help">{{ t("resourceDefsAdmin.noChildren") }}</p>
          <div v-for="(c, i) in form.children" :key="i" class="child-row">
            <input v-model="c.relationUri" :placeholder="t('resourceDefsAdmin.childRelationPlaceholder')" />
            <input v-model="c.target" list="rd-prefixes" :placeholder="t('resourceDefsAdmin.childTargetPlaceholder')" />
            <input v-model="c.title" :placeholder="t('resourceDefsAdmin.childTitlePlaceholder')" />
            <button type="button" class="btn sm ghost" :aria-label="t('resourceDefsAdmin.removeChildAria')" @click="removeChild(i)">
              <AppIcon name="x" :size="12" />
            </button>
          </div>
          <datalist id="rd-prefixes">
            <option v-for="p in prefixes" :key="p" :value="p" />
          </datalist>
        </div>

        <div class="actions">
          <button class="btn primary" type="submit" :disabled="save.isPending.value">
            {{ save.isPending.value ? t("resourceDefsAdmin.saving") : isEditing ? t("resourceDefsAdmin.saveChanges") : t("resourceDefsAdmin.createType") }}
          </button>
          <button type="button" class="btn ghost" @click="resetForm(); showForm = false">{{ t("resourceDefsAdmin.cancel") }}</button>
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
  color: var(--fair-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
h1 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 32px;
  color: var(--fair-text-strong);
}
.lede {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fair-text);
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
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  background: var(--fair-bg);
}
.type__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 15px;
  color: var(--fair-text-strong);
}
.type__schema {
  font-size: 11px;
  color: var(--fair-text-muted);
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
  border: 1px solid var(--fair-border);
  color: var(--fair-text);
}
.chip.muted {
  color: var(--fair-text-muted);
}
.chip.soft {
  background: var(--fair-highlight);
  border-color: var(--fair-separator);
}
.form {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid var(--fair-separator);
  padding-top: 24px;
}
.form h2 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 22px;
  color: var(--fair-text-strong);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fair-text-muted);
}
input {
  font-family: var(--fair-font-sans);
  font-size: 14px;
  padding: 10px 12px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  background: var(--fair-bg);
  color: var(--fair-text-strong);
  width: 100%;
  box-sizing: border-box;
}
input:disabled {
  background: var(--fair-highlight);
  color: var(--fair-text-muted);
}
.help {
  font-size: 11px;
  color: var(--fair-text-muted);
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
  color: var(--fair-text-muted);
}
.notice h2 {
  font-family: var(--fair-font-sans);
  font-weight: 400;
  color: var(--fair-text-strong);
  margin: 0 0 6px;
}
.error {
  border: 1px solid var(--fair-warning);
  border-radius: var(--fair-radius-md);
  padding: 12px 14px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--fair-text);
}
.error strong {
  color: var(--fair-text-strong);
}
.violations {
  margin: 8px 0 0;
  padding-left: 18px;
}
.btn.danger {
  color: var(--fair-warning);
}
</style>
