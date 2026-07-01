<script setup lang="ts">
/**
 * Licenses view (Phase 5, task 5.4) — manage descriptive license documents
 * (`dct:license` targets; not PDP-enforced). A lifecycle surface mirroring the
 * policy editor, but the "editor" is just title / canonical source IRI /
 * description, SHACL-validated server-side on save.
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useMutation } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import { deleteLicense, getLicenseTurtle, putLicense, validateLicense } from "@/api/licenses";
import type { PolicyValidation } from "@/api/policies";
import { useLicenses, useInvalidateLicenses } from "@/composables/useLicenses";
import { parseFdpError, type ParsedError } from "@/api/errors";
import TurtleEditor from "@/components/shacl-editor/TurtleEditor.vue";
import { parseLicense, serializeLicense, type LicenseFields } from "@/components/license-editor/licenseDoc";

const { t } = useI18n();
const auth = useAuthStore();
const { licenses, isLoading } = useLicenses();
const invalidate = useInvalidateLicenses();

const slug = ref("");
const fields = ref<LicenseFields>({ title: "", source: "", description: "" });
const savedId = ref<string | null>(null);
const error = ref<ParsedError | null>(null);
const validation = ref<PolicyValidation | null>(null);

const slugLocked = computed(() => savedId.value !== null);
const iriFor = (s: string) => `${apiBase()}/licenses/${s.trim() || "draft"}`;
const turtle = computed(() => serializeLicense(iriFor(slug.value), fields.value));

function setField<K extends keyof LicenseFields>(k: K, v: string) {
  fields.value = { ...fields.value, [k]: v };
}

function startNew() {
  slug.value = "";
  fields.value = { title: "", source: "", description: "" };
  savedId.value = null;
  error.value = null;
  validation.value = null;
}

async function load(id: string) {
  error.value = null;
  validation.value = null;
  try {
    fields.value = parseLicense(await getLicenseTurtle(id), iriFor(id));
    slug.value = id;
    savedId.value = id;
  } catch (e) {
    error.value = parseFdpError(e);
  }
}

const save = useMutation({
  mutationFn: () => putLicense(slug.value.trim(), turtle.value),
  onSuccess: async (info) => {
    savedId.value = info.id;
    error.value = null;
    validation.value = null;
    await invalidate();
  },
  onError: (e) => (error.value = parseFdpError(e)),
});

const remove = useMutation({
  mutationFn: (id: string) => deleteLicense(id),
  onSuccess: async () => {
    await invalidate();
    startNew();
  },
  onError: (e) => (error.value = parseFdpError(e)),
});

const check = useMutation({
  mutationFn: () => validateLicense(slug.value.trim() || "draft", turtle.value),
  onSuccess: (r) => {
    validation.value = r;
    error.value = null;
  },
  onError: (e) => {
    error.value = parseFdpError(e);
    validation.value = null;
  },
});

function onSave() {
  error.value = null;
  if (!slug.value.trim() || !fields.value.title.trim()) {
    error.value = {
      title: t("licenses.errMissingFieldTitle"),
      message: t("licenses.errMissingFieldMsg"),
      code: "client.validation",
      status: null,
      docsUrl: null,
      violations: [],
      fromServer: false,
    };
    return;
  }
  save.mutate();
}

function onDelete() {
  if (savedId.value && window.confirm(t("licenses.deleteConfirm", { id: savedId.value }))) remove.mutate(savedId.value);
}
async function copyTurtle() {
  try {
    await navigator.clipboard.writeText(turtle.value);
  } catch {
    /* no-op */
  }
}
</script>

<template>
  <section class="page">
    <header class="head">
      <div class="eyebrow mono">{{ t("licenses.eyebrow") }}</div>
      <h1>{{ t("licenses.heading") }}</h1>
      <i18n-t keypath="licenses.lede" tag="p" class="lede" scope="global">
        <template #dctLicense><code class="mono">dct:license</code></template>
        <template #policiesLink><RouterLink to="/policies">{{ t("licenses.ledePolicies") }}</RouterLink></template>
      </i18n-t>
    </header>

    <div v-if="!auth.isAdmin" class="notice"><p>{{ t("licenses.adminNotice") }}</p></div>

    <div v-if="error" class="error">
      <strong>{{ error.title }}</strong>
      <p>{{ error.message }}</p>
    </div>

    <div class="layout">
      <aside class="list">
        <div class="list__head">
          <span class="label">{{ t("licenses.managed") }}</span>
          <button class="btn sm" @click="startNew">{{ t("licenses.new") }}</button>
        </div>
        <div v-if="isLoading" class="muted">{{ t("licenses.loading") }}</div>
        <ul v-else class="items">
          <li v-for="l in licenses" :key="l.id">
            <button class="item" :class="{ active: l.id === savedId }" @click="load(l.id)">
              <span class="item__id">{{ l.title || l.id }}</span>
              <span class="item__meta mono">{{ l.id }}{{ l.state ? ` · ${l.state}` : "" }}</span>
            </button>
          </li>
          <li v-if="!licenses.length" class="muted">{{ t("licenses.noLicenses") }}</li>
        </ul>
      </aside>

      <div class="editor">
        <div class="form">
          <label class="field">
            <span class="label">{{ t("licenses.idSlugLabel") }}</span>
            <input :value="slug" :disabled="slugLocked" :placeholder="t('licenses.idSlugPlaceholder')" @input="slug = ($event.target as HTMLInputElement).value" />
            <span class="help mono">/licenses/{{ slug || "…" }}</span>
          </label>
          <label class="field">
            <span class="label">{{ t("licenses.titleLabel") }} <em class="mono">dct:title</em></span>
            <input :value="fields.title" :placeholder="t('licenses.titlePlaceholder')" @input="setField('title', ($event.target as HTMLInputElement).value)" />
          </label>
          <label class="field">
            <span class="label">{{ t("licenses.canonicalIriLabel") }} <em class="mono">dct:source</em></span>
            <input class="mono" :value="fields.source" :placeholder="t('licenses.canonicalIriPlaceholder')" @input="setField('source', ($event.target as HTMLInputElement).value)" />
          </label>
          <label class="field">
            <span class="label">{{ t("licenses.descriptionLabel") }} <em class="mono">dct:description</em></span>
            <textarea rows="3" :value="fields.description" @input="setField('description', ($event.target as HTMLTextAreaElement).value)" />
          </label>

          <div class="actions">
            <button class="btn primary" :disabled="!auth.isAdmin || save.isPending.value" @click="onSave">
              {{ save.isPending.value ? t("licenses.saving") : savedId ? t("licenses.saveNewVersion") : t("licenses.publish") }}
            </button>
            <button class="btn sm" :disabled="check.isPending.value" @click="check.mutate()">
              {{ check.isPending.value ? t("licenses.validating") : t("licenses.validate") }}
            </button>
            <button class="btn sm" @click="copyTurtle">{{ t("licenses.copy") }}</button>
            <button v-if="savedId" class="btn ghost danger" :disabled="!auth.isAdmin || remove.isPending.value" @click="onDelete">{{ t("licenses.delete") }}</button>
          </div>

          <div v-if="validation" class="result" :class="validation.conforms ? 'ok' : 'bad'">
            <strong>{{ validation.conforms ? t("licenses.valid") : t("licenses.doesNotConform") }}</strong>
            <ul v-if="validation.violations.length" class="violations">
              <li v-for="(v, i) in validation.violations" :key="i">
                {{ v.message }}<span v-if="v.detail" class="mono muted"> ({{ v.detail }})</span>
              </li>
            </ul>
          </div>
        </div>

        <TurtleEditor :model-value="turtle" readonly :aria-label="t('licenses.previewAria')" class="preview" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 64px 48px;
  max-width: 1180px;
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
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 24px;
  margin-top: 24px;
}
.list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item {
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
.item.active {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}
.item__id {
  font-weight: 500;
  font-size: 13px;
  color: var(--ink);
}
.item__meta {
  font-size: 10px;
  color: var(--muted);
}
.editor {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr);
  gap: 18px;
  align-items: start;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.label em {
  font-style: normal;
  text-transform: none;
  letter-spacing: 0;
  color: var(--muted-2);
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
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.preview {
  min-height: 360px;
  height: 100%;
}
.notice,
.error,
.result {
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  padding: 12px 14px;
  font-size: 13px;
}
.notice {
  color: var(--muted);
  margin-bottom: 14px;
}
.error {
  border-color: var(--signal);
  margin-bottom: 14px;
}
.result.ok {
  border-color: var(--ok);
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
@media (max-width: 980px) {
  .page {
    padding: 28px 20px 40px;
  }
  .layout,
  .editor {
    grid-template-columns: 1fr;
  }
}
</style>
