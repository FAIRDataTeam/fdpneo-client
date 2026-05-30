<script setup lang="ts">
/**
 * Edit (and delete) a metadata entity (Phase 7.3 / 7.4).
 *
 * Read-modify-write: read the record graph + ETag, edit the spec's fields, PUT
 * the whole graph back with `If-Match` (preserving rdf:type, isPartOf, and any
 * triples the form doesn't manage). Stale ETag → 412 conflict; the server also
 * enforces steward-modify so this gate is UX only.
 */
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import { readGraph } from "@/api/records";
import {
  applyEditTurtle,
  modelFromTurtle,
  specFor,
  typeForId,
  type EntityModel,
  type EntitySpec,
} from "@/api/entityForms";
import { useEntityShape } from "@/composables/useEntityShape";
import { useUpdateRecord, useDeleteRecord } from "@/composables/useRecordMutations";
import { parseFdpError, type ParsedError } from "@/api/errors";
import EntityForm from "@/components/metadata/EntityForm.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const update = useUpdateRecord();
const remove = useDeleteRecord();

const id = computed(() => {
  const raw = route.params.id;
  return Array.isArray(raw) ? raw.join("/") : String(raw);
});
const type = computed(() => typeForId(id.value));
const iri = computed(() => `${apiBase()}/${id.value}`);

// Fields from the type's SHACL shape (7.5), falling back to the static spec.
const { data: shapeFields, isLoading: shapeLoading } = useEntityShape(type);
const spec = computed<EntitySpec | null>(() => {
  if (!type.value) return null;
  const base = specFor(type.value);
  const fields = shapeFields.value?.length ? shapeFields.value : base.fields;
  return { ...base, fields };
});

const model = ref<EntityModel>({});
const recordLoaded = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref<ParsedError | null>(null);

// Loading until both the record and the shape have resolved.
const loading = computed(() => !recordLoaded.value || (shapeLoading.value && !!type.value));

let rawTurtle = "";
let etag: string | null = null;

onMounted(async () => {
  if (!auth.isSteward || !type.value) {
    recordLoaded.value = true;
    return;
  }
  try {
    const res = await readGraph(id.value);
    rawTurtle = res.turtle;
    etag = res.etag;
  } catch (e) {
    error.value = parseFdpError(e);
  } finally {
    recordLoaded.value = true;
  }
});

// Build the model once the record is read and the shape (fields) has settled.
watch(
  [recordLoaded, shapeLoading, spec],
  () => {
    if (recordLoaded.value && !shapeLoading.value && spec.value && rawTurtle) {
      model.value = modelFromTurtle(rawTurtle, iri.value, spec.value);
    }
  },
  { immediate: true },
);

async function save() {
  if (!spec.value || saving.value) return;
  if (!String(model.value.title ?? "").trim()) {
    error.value = clientError("Title is required", "The record must keep a title.");
    return;
  }
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    const turtle = await applyEditTurtle(rawTurtle, iri.value, spec.value, model.value);
    etag = await update.mutateAsync({ path: id.value, turtle, etag });
    rawTurtle = turtle;
    saved.value = true;
  } catch (e) {
    error.value = parseFdpError(e);
  } finally {
    saving.value = false;
  }
}

async function del() {
  if (!confirm(`Delete ${spec.value?.label.toLowerCase()} "${String(model.value.title ?? id.value)}"? This cannot be undone.`)) {
    return;
  }
  error.value = null;
  try {
    await remove.mutateAsync({ path: id.value, etag });
    await router.push("/");
  } catch (e) {
    error.value = parseFdpError(e);
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
      <p>Editing metadata requires the steward role.</p>
      <RouterLink to="/" class="btn ghost">Back to browse</RouterLink>
    </div>

    <div v-else-if="!spec" class="notice">
      <h2>Unknown type</h2>
      <p><span class="mono">{{ id }}</span> is not an editable resource type.</p>
    </div>

    <div v-else-if="loading" class="notice">Loading…</div>

    <template v-else>
      <header class="head">
        <div class="eyebrow mono">FDP Neo · Edit {{ spec.label }}</div>
        <h1>Edit {{ spec.label.toLowerCase() }}</h1>
        <RouterLink :to="`/records/${id}`" class="lede mono">{{ iri }}</RouterLink>
      </header>

      <form class="form" @submit.prevent="save">
        <EntityForm v-model="model" :spec="spec" />

        <div v-if="error" class="error">
          <strong>{{ error.title }}</strong>
          <p>{{ error.message }}</p>
          <ul v-if="error.violations.length" class="violations">
            <li v-for="(v, i) in error.violations" :key="i">
              <span v-if="v.path" class="mono">{{ v.path }}</span> {{ v.message }}
            </li>
          </ul>
          <p v-if="error.status === 412" class="hint">
            This record changed since you opened it — reload and re-apply your edits.
          </p>
        </div>

        <p v-if="saved" class="ok">Saved.</p>

        <div class="actions">
          <button class="btn primary" type="submit" :disabled="saving">
            {{ saving ? "Saving…" : "Save" }}
          </button>
          <RouterLink :to="`/records/${id}`" class="btn ghost">View</RouterLink>
          <div class="spacer" />
          <button class="btn danger" type="button" @click="del">Delete</button>
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
  display: inline-block;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
  word-break: break-all;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
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
.hint {
  color: var(--muted);
  font-size: 12px;
}
.ok {
  color: var(--ok);
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.spacer {
  flex: 1;
}
.btn.danger {
  border-color: var(--signal);
  color: var(--signal);
}
</style>
