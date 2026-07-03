<script setup lang="ts">
/**
 * Policies view — the visual ODRL editor (Phase 5).
 *
 * A lifecycle surface (mirrors SchemaEditorView): list managed policies → load
 * one → compose with the guided composer → server-validate → save (`PUT
 * /policies/{id}`) → delete. The composer can only emit FDP-profile constructs;
 * the server validates again on write and its violations surface inline.
 */
import { computed, ref } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import { deletePolicy, getPolicyTurtle, putPolicy, validatePolicy, type PolicyValidation } from "@/api/policies";
import { usePolicies, useInvalidatePolicies } from "@/composables/usePolicies";
import { parseFdpError, type ParsedError } from "@/api/errors";
import OdrlComposer from "@/components/odrl-editor/OdrlComposer.vue";
import OdrlPreview from "@/components/odrl-editor/OdrlPreview.vue";
import { newOffer } from "@/components/odrl-editor/factories";
import { parseOffer } from "@/components/odrl-editor/parse";
import { serializeOffer } from "@/components/odrl-editor/serialize";
import type { OfferModel } from "@/components/odrl-editor/model";

const { t } = useI18n();
const auth = useAuthStore();
const { policies, isLoading } = usePolicies();
const invalidate = useInvalidatePolicies();

const slug = ref("");
const offer = ref<OfferModel>(newOffer());
const savedId = ref<string | null>(null);
const error = ref<ParsedError | null>(null);
const validation = ref<PolicyValidation | null>(null);
const loadingPolicy = ref(false);

const slugLocked = computed(() => savedId.value !== null);
const turtle = computed(() => serializeOffer(offer.value));

/** The Offer's stable IRI, derived from the slug (the server stores it there). */
function deriveIri(s: string): string {
  return s.trim() ? `${apiBase()}/policies/${s.trim()}` : ":NewPolicy";
}
function onSlug(v: string) {
  slug.value = v;
  offer.value = { ...offer.value, iri: deriveIri(v) };
}
function onUpdate(next: OfferModel) {
  offer.value = next;
}

function startNew() {
  slug.value = "";
  offer.value = newOffer();
  savedId.value = null;
  error.value = null;
  validation.value = null;
}

async function load(id: string) {
  error.value = null;
  validation.value = null;
  loadingPolicy.value = true;
  try {
    offer.value = parseOffer(await getPolicyTurtle(id));
    slug.value = id;
    savedId.value = id;
  } catch (e) {
    error.value = parseFdpError(e);
  } finally {
    loadingPolicy.value = false;
  }
}

const save = useMutation({
  mutationFn: () => putPolicy(slug.value.trim(), turtle.value),
  onSuccess: async (info) => {
    savedId.value = info.id;
    error.value = null;
    validation.value = null;
    await invalidate();
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

const remove = useMutation({
  mutationFn: (id: string) => deletePolicy(id),
  onSuccess: async () => {
    await invalidate();
    startNew();
  },
  onError: (e) => {
    error.value = parseFdpError(e);
  },
});

const check = useMutation({
  mutationFn: () => validatePolicy(slug.value.trim() || "draft", turtle.value),
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
  validation.value = null;
  if (!slug.value.trim()) {
    error.value = {
      title: t("odrl.errMissingIdTitle"),
      message: t("odrl.errMissingIdMsg"),
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
  if (savedId.value && window.confirm(t("odrl.deleteConfirm", { id: savedId.value }))) {
    remove.mutate(savedId.value);
  }
}

async function copyTurtle() {
  try {
    await navigator.clipboard.writeText(turtle.value);
  } catch {
    /* clipboard unavailable — no-op */
  }
}
</script>

<template>
  <section class="page">
    <header class="head">
      <div class="eyebrow mono">{{ t("odrl.eyebrow") }}</div>
      <h1>{{ t("odrl.heading") }}</h1>
      <i18n-t keypath="odrl.lede" tag="p" class="lede" scope="global">
        <template #offers><strong>{{ t("odrl.ledeOffers") }}</strong></template>
        <template #rights><code class="mono">dct:rights</code></template>
      </i18n-t>
    </header>

    <div v-if="!auth.isAdmin" class="notice">
      <p>{{ t("odrl.adminOnlyNotice") }}</p>
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
          <span class="label">{{ t("odrl.managed") }}</span>
          <button class="btn sm" @click="startNew">{{ t("odrl.new") }}</button>
        </div>
        <div v-if="isLoading" class="muted">{{ t("odrl.loading") }}</div>
        <ul v-else class="policies">
          <li v-for="p in policies" :key="p.id">
            <button class="policy" :class="{ active: p.id === savedId }" @click="load(p.id)">
              <span class="policy__id">{{ p.title || p.id }}</span>
              <span class="policy__meta mono">{{ p.permissions }}P · {{ p.prohibitions }}X{{ p.state ? ` · ${p.state}` : "" }}</span>
            </button>
          </li>
          <li v-if="!policies.length" class="muted">{{ t("odrl.noPolicies") }}</li>
        </ul>
      </aside>

      <div class="editor">
        <label class="field">
          <span class="label">{{ t("odrl.idLabel") }}</span>
          <input :value="slug" :disabled="slugLocked" placeholder="my-policy" @input="onSlug(($event.target as HTMLInputElement).value)" />
          <span class="help mono">/policies/{{ slug || "…" }}</span>
        </label>

        <div class="actions">
          <button class="btn primary" :disabled="!auth.isAdmin || save.isPending.value" @click="onSave">
            {{ save.isPending.value ? t("odrl.saving") : savedId ? t("odrl.saveNewVersion") : t("odrl.publish") }}
          </button>
          <button class="btn sm" :disabled="check.isPending.value" @click="check.mutate()">
            {{ check.isPending.value ? t("odrl.validating") : t("odrl.validate") }}
          </button>
          <button class="btn sm" @click="copyTurtle">{{ t("odrl.copy") }}</button>
          <button v-if="savedId" class="btn ghost danger" :disabled="!auth.isAdmin || remove.isPending.value" @click="onDelete">
            {{ t("odrl.delete") }}
          </button>
          <span v-if="loadingPolicy" class="help">{{ t("odrl.loading") }}</span>
        </div>

        <div v-if="validation" class="result" :class="validation.conforms ? 'ok' : 'bad'">
          <strong>{{ validation.conforms ? t("odrl.conforms") : t("odrl.doesNotConform") }}</strong>
          <ul v-if="validation.violations.length" class="violations">
            <li v-for="(v, i) in validation.violations" :key="i">
              {{ v.message }}<span v-if="v.detail" class="mono muted"> ({{ v.detail }})</span>
            </li>
          </ul>
        </div>

        <div class="workbench">
          <OdrlComposer :offer="offer" :show-id="false" @update:offer="onUpdate" />
          <OdrlPreview :offer="offer" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 64px 48px;
  max-width: 1320px;
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
  font-weight: var(--fair-weight-bold);
  font-size: 32px;
  letter-spacing: var(--fair-tracking-display);
  color: var(--fair-text-strong);
}
.lede {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fair-text);
  max-width: 680px;
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
.policies {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.policy {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  background: var(--fair-bg);
  cursor: pointer;
}
.policy.active {
  border-color: var(--fair-node-soft);
  background: var(--tool-accent-tint);
}
.policy__id {
  font-weight: 500;
  font-size: 13px;
  color: var(--fair-text-strong);
}
.policy__meta {
  font-size: 10px;
  color: var(--fair-text-muted);
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
  max-width: 360px;
}
.label {
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
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.workbench {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(340px, 1fr);
  gap: 18px;
  align-items: start;
}
.notice,
.error,
.result {
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  padding: 12px 14px;
  font-size: 13px;
}
.notice {
  color: var(--fair-text-muted);
  margin-bottom: 14px;
}
.error {
  border-color: var(--fair-danger);
  color: var(--fair-text);
  margin-bottom: 14px;
}
.error strong {
  color: var(--fair-text-strong);
}
.result.ok {
  border-color: var(--fair-success);
}
.result.bad {
  border-color: var(--fair-danger);
}
.violations {
  margin: 8px 0 0;
  padding-left: 18px;
}
.muted {
  color: var(--fair-text-muted);
  font-size: 12px;
}
.btn.danger {
  color: var(--fair-danger);
}
@media (max-width: 980px) {
  .page {
    padding: 28px 20px 40px;
  }
  .layout,
  .workbench {
    grid-template-columns: 1fr;
  }
}
</style>
