<script setup lang="ts">
/**
 * Create a metadata entity (Phase 7.2).
 *
 * Type comes from the route (`/create/:type`); the optional `?parent=<iri>`
 * sets `dct:isPartOf`. We build the resource at a client-chosen slug via
 * `PUT /{type}/{slug}` (LDP create) — the server returns 201, or 428 if the id
 * is already taken (it requires `If-Match` to overwrite), so we can't clobber.
 */
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import {
  buildCreateTurtle,
  emptyModel,
  missingOrGroups,
  validateConstraints,
  type EntityModel,
  type EntitySpec,
} from "@/api/entityForms";
import { useEntityShape } from "@/composables/useEntityShape";
import { useResourceTypes } from "@/composables/useResourceTypes";
import { useCreateRecord, recordExists } from "@/composables/useRecordMutations";
import { parseFdpError, type ParsedError } from "@/api/errors";
import { slugify } from "@/utils/slug";
import EntityForm from "@/components/metadata/EntityForm.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const create = useCreateRecord();
const { specFor, typeForId } = useResourceTypes();

const type = computed(() => typeForId(String(route.params.type)));
const parentIri = computed(() => {
  const p = route.query.parent;
  return typeof p === "string" && p ? p : null;
});

// Resolve the type's base spec (URL prefix + class IRI) from the runtime
// catalog, then layer the SHACL-derived fields (7.5) over the static fallback.
const baseSpec = computed<EntitySpec | null>(() =>
  type.value ? specFor(type.value) : null,
);
const { data: shapeForm, isLoading: shapeLoading } = useEntityShape(baseSpec);
const spec = computed<EntitySpec | null>(() => {
  if (!baseSpec.value) return null;
  const fields = shapeForm.value?.fields.length ? shapeForm.value.fields : baseSpec.value.fields;
  const orGroups = shapeForm.value?.orGroups ?? baseSpec.value.orGroups ?? [];
  return { ...baseSpec.value, fields, orGroups };
});

const model = ref<EntityModel>({});
const slug = ref("");
const error = ref<ParsedError | null>(null);
const submitting = ref(false);

// (Re)build the empty model once the spec (incl. shape-derived fields) settles
// or the create type changes.
watch(
  spec,
  (s) => {
    model.value = s ? emptyModel(s) : {};
    slug.value = "";
    error.value = null;
  },
  { immediate: true },
);

const effectiveSlug = computed(() => slugify(slug.value || String(model.value.title ?? "")));

async function submit() {
  if (!spec.value || submitting.value) return;
  const titleVal = String(model.value.title ?? "").trim();
  if (!titleVal) {
    error.value = clientError(t("entityAuthor.errTitleRequired"), t("entityAuthor.errTitleRequiredCreate"));
    return;
  }
  // "At least one of" (sh:or) groups — provide a value for at least one member.
  const missing = missingOrGroups(spec.value, model.value);
  if (missing.length) {
    const labels = missing[0]!.keys.map(
      (k) => spec.value!.fields.find((f) => f.key === k)?.label ?? k,
    );
    error.value = clientError(t("entityAuthor.errAtLeastOneTitle"), t("entityAuthor.errAtLeastOneMsg", { labels: labels.join(", ") }));
    return;
  }
  const bad = validateConstraints(spec.value, model.value);
  if (bad) {
    error.value = clientError(t("entityAuthor.errInvalidTitle", { label: bad.label }), t("entityAuthor.errInvalidMsg", { label: bad.label, message: bad.message }));
    return;
  }
  const s = effectiveSlug.value;
  if (!s) {
    error.value = clientError(t("entityAuthor.errInvalidIdTitle"), t("entityAuthor.errInvalidIdMsg"));
    return;
  }
  const path = `${spec.value.prefix}/${s}`;
  submitting.value = true;
  error.value = null;
  try {
    if (await recordExists(path)) {
      error.value = clientError(t("entityAuthor.errIdTakenTitle"), t("entityAuthor.errIdTakenMsg", { path }));
      return;
    }
    const iri = `${apiBase()}/${path}`;
    const turtle = await buildCreateTurtle(iri, spec.value, model.value, parentIri.value);
    await create.mutateAsync({ path, turtle });
    await router.push(`/records/${path}`);
  } catch (e) {
    error.value = parseFdpError(e);
  } finally {
    submitting.value = false;
  }
}

function clientError(title: string, message: string): ParsedError {
  return { title, message, code: "client.validation", status: null, docsUrl: null, violations: [], fromServer: false };
}
</script>

<template>
  <section class="page">
    <div v-if="!auth.isSteward" class="notice">
      <h2>{{ t("entityAuthor.notAllowedTitle") }}</h2>
      <p>{{ t("entityAuthor.createNotAllowedMsg") }}</p>
      <RouterLink to="/" class="btn ghost">{{ t("entityAuthor.backToBrowse") }}</RouterLink>
    </div>

    <div v-else-if="!type" class="notice">
      <h2>{{ t("entityAuthor.unknownTypeTitle") }}</h2>
      <p>{{ t("entityAuthor.createUnknownTypeMsg", { type: String(route.params.type) }) }}</p>
      <RouterLink to="/" class="btn ghost">{{ t("entityAuthor.backToBrowse") }}</RouterLink>
    </div>

    <div v-else-if="shapeLoading || !spec" class="notice">{{ t("entityAuthor.loadingForm") }}</div>

    <template v-else>
      <header class="head">
        <div class="eyebrow mono">{{ t("entityAuthor.createEyebrow", { type: spec.label }) }}</div>
        <h1>{{ t("entityAuthor.createHeading", { type: spec.label }) }}</h1>
        <p v-if="parentIri" class="lede mono">{{ t("entityAuthor.createParent", { parent: parentIri }) }}</p>
        <i18n-t keypath="entityAuthor.draftHint" tag="p" class="draft-hint" scope="global">
          <template #draft><strong>{{ t("entityAuthor.draftWord") }}</strong></template>
        </i18n-t>
      </header>

      <form class="form" @submit.prevent="submit">
        <EntityForm v-model="model" :spec="spec" />

        <label class="field">
          <span class="label">{{ t("entityAuthor.idSlugLabel") }}</span>
          <input v-model="slug" type="text" :placeholder="effectiveSlug || t('entityAuthor.idSlugPlaceholderAuto')" :aria-label="t('entityAuthor.idSlugAria')" />
          <span class="help mono">/{{ spec.prefix }}/{{ effectiveSlug || "…" }}</span>
        </label>

        <div v-if="error" class="error">
          <strong>{{ error.title }}</strong>
          <p>{{ error.message }}</p>
          <ul v-if="error.violations.length" class="violations">
            <li v-for="(v, i) in error.violations" :key="i">
              <span v-if="v.path" class="mono">{{ v.path }}</span> {{ v.message }}
            </li>
          </ul>
        </div>

        <div class="actions">
          <button class="btn primary" type="submit" :disabled="submitting">
            {{ submitting ? t("entityAuthor.creating") : t("entityAuthor.createButton", { type: spec.label }) }}
          </button>
          <RouterLink to="/" class="btn ghost">{{ t("entityAuthor.cancel") }}</RouterLink>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 80px 48px;
  max-width: 760px;
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
  font-size: 12px;
  color: var(--muted);
  word-break: break-all;
}
.draft-hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--ink-2);
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
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
.help {
  font-size: 11px;
  color: var(--muted);
}
.notice {
  padding: 48px 0;
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
.actions {
  display: flex;
  gap: 10px;
}
</style>
