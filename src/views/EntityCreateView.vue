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
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import {
  buildCreateTurtle,
  emptyModel,
  specFor,
  typeForId,
  type EntityModel,
} from "@/api/entityForms";
import { useCreateRecord, recordExists } from "@/composables/useRecordMutations";
import { parseFdpError, type ParsedError } from "@/api/errors";
import EntityForm from "@/components/metadata/EntityForm.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const create = useCreateRecord();

const type = computed(() => typeForId(String(route.params.type)));
const spec = computed(() => (type.value ? specFor(type.value) : null));
const parentIri = computed(() => {
  const p = route.query.parent;
  return typeof p === "string" && p ? p : null;
});

const model = ref<EntityModel>(spec.value ? emptyModel(spec.value) : {});
const slug = ref("");
const error = ref<ParsedError | null>(null);
const submitting = ref(false);

// Reset the form if the create type changes (route component reuse).
watch(spec, (s) => {
  model.value = s ? emptyModel(s) : {};
  slug.value = "";
  error.value = null;
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const effectiveSlug = computed(() => slugify(slug.value || String(model.value.title ?? "")));

async function submit() {
  if (!spec.value || submitting.value) return;
  const titleVal = String(model.value.title ?? "").trim();
  if (!titleVal) {
    error.value = clientError("Title is required", "Give the new record a title.");
    return;
  }
  const s = effectiveSlug.value;
  if (!s) {
    error.value = clientError("Invalid id", "Could not derive a valid id from the title; set one explicitly.");
    return;
  }
  const path = `${spec.value.prefix}/${s}`;
  submitting.value = true;
  error.value = null;
  try {
    if (await recordExists(path)) {
      error.value = clientError("Id already taken", `A record already exists at /${path}. Choose a different id.`);
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
      <h2>Not allowed</h2>
      <p>Creating metadata requires the steward role.</p>
      <RouterLink to="/" class="btn ghost">Back to browse</RouterLink>
    </div>

    <div v-else-if="!spec" class="notice">
      <h2>Unknown type</h2>
      <p>"{{ route.params.type }}" is not a creatable resource type.</p>
      <RouterLink to="/" class="btn ghost">Back to browse</RouterLink>
    </div>

    <template v-else>
      <header class="head">
        <div class="eyebrow mono">FDP Neo · New {{ spec.label }}</div>
        <h1>Create {{ spec.label.toLowerCase() }}</h1>
        <p v-if="parentIri" class="lede mono">in {{ parentIri }}</p>
      </header>

      <form class="form" @submit.prevent="submit">
        <EntityForm v-model="model" :spec="spec" />

        <label class="field">
          <span class="label">Id (slug)</span>
          <input v-model="slug" type="text" :placeholder="effectiveSlug || 'auto from title'" aria-label="Identifier slug" />
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
            {{ submitting ? "Creating…" : `Create ${spec.label.toLowerCase()}` }}
          </button>
          <RouterLink to="/" class="btn ghost">Cancel</RouterLink>
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
