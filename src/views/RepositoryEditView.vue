<script setup lang="ts">
/**
 * Edit the FDP repository (root) metadata.
 *
 * The root is just another typed record (its class is the FDP profile's
 * FAIRDataPoint, which composes MetadataService → DataService → Resource), so it
 * uses the **same** SHACL-driven form pipeline as every other type
 * (`useEntityShape` → `EntityForm` → `applyEditTurtle`). That closure-aware
 * generator surfaces all inherited properties, so the repository form can never
 * drift from its schema the way a hand-rolled field list did.
 *
 * Read-modify-write: read the root graph + ETag, edit only the spec's fields, PUT
 * the whole graph back with `If-Match` so rdf:type, the bundled offer/rights and
 * any unmanaged triples survive and concurrent edits are detected. Gated to
 * stewards (the server enforces the same via the bundled steward-modify offer).
 */
import { computed, onMounted, ref, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import { readGraph, putGraph } from "@/api/records";
import {
  applyEditTurtle,
  missingOrGroups,
  modelFromTurtle,
  validateConstraints,
  type EntityModel,
  type EntitySpec,
} from "@/api/entityForms";
import { useEntityShape } from "@/composables/useEntityShape";
import { useResourceTypes } from "@/composables/useResourceTypes";
import { parseFdpError, type ParsedError } from "@/api/errors";
import EntityForm from "@/components/metadata/EntityForm.vue";

const auth = useAuthStore();
const queryClient = useQueryClient();
const { specFor, defs } = useResourceTypes();

const iri = apiBase();

// The root resource definition (empty prefix). Its class is FAIRDataPoint; the
// SHACL closure served at /fdp-api/spec carries the inherited property shapes.
const baseSpec = computed<EntitySpec | null>(() => {
  const root = defs.value.find((d) => d.isRoot) ?? defs.value.find((d) => d.urlPrefix === "");
  return root ? specFor(root.urlPrefix) : null;
});
const { data: shapeForm, isLoading: shapeLoading } = useEntityShape(baseSpec);
const spec = computed<EntitySpec | null>(() => {
  if (!baseSpec.value) return null;
  const fields = shapeForm.value?.fields.length ? shapeForm.value.fields : baseSpec.value.fields;
  const orGroups = shapeForm.value?.orGroups ?? baseSpec.value.orGroups ?? [];
  return { ...baseSpec.value, fields, orGroups };
});

const model = ref<EntityModel>({});
const recordLoaded = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref<ParsedError | null>(null);

const loading = computed(() => !recordLoaded.value || (shapeLoading.value && !!baseSpec.value));

let rawTurtle = "";
let etag: string | null = null;

onMounted(async () => {
  if (!auth.isSteward) {
    recordLoaded.value = true;
    return;
  }
  try {
    const res = await readGraph("");
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
      model.value = modelFromTurtle(rawTurtle, iri, spec.value);
    }
  },
  { immediate: true },
);

function clientError(title: string, message: string): ParsedError {
  return { title, message, code: "client.validation", status: null, docsUrl: null, violations: [], fromServer: false };
}

async function save() {
  if (!spec.value || saving.value) return;
  if (!String(model.value.title ?? "").trim()) {
    error.value = clientError("Title is required", "The repository must have a title.");
    return;
  }
  const missing = missingOrGroups(spec.value, model.value);
  if (missing.length) {
    const labels = missing[0]!.keys.map((k) => spec.value!.fields.find((f) => f.key === k)?.label ?? k);
    error.value = clientError("At least one required", `Provide at least one of: ${labels.join(", ")}.`);
    return;
  }
  const bad = validateConstraints(spec.value, model.value);
  if (bad) {
    error.value = clientError(`${bad.label} is invalid`, `${bad.label} ${bad.message}.`);
    return;
  }
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    const turtle = await applyEditTurtle(rawTurtle, iri, spec.value, model.value);
    etag = await putGraph("", turtle, etag);
    rawTurtle = turtle;
    saved.value = true;
    await queryClient.invalidateQueries({ queryKey: ["repository"] });
  } catch (e) {
    error.value = parseFdpError(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="page">
    <header class="head">
      <div class="eyebrow mono">FDP Neo · Repository</div>
      <h1>Edit repository metadata</h1>
      <p class="lede">The root of this FAIR Data Point. Visible to everyone; editable by stewards.</p>
    </header>

    <div v-if="!auth.isSteward" class="notice">
      <h2>Not allowed</h2>
      <p>Editing the repository requires the steward role.</p>
      <RouterLink to="/" class="btn ghost">Back to browse</RouterLink>
    </div>

    <div v-else-if="loading" class="notice">Loading…</div>

    <div v-else-if="!spec" class="notice">
      <h2>Schema unavailable</h2>
      <p>Couldn't resolve the repository's SHACL shape. Try again, or check the server.</p>
    </div>

    <form v-else class="form" @submit.prevent="save">
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
          The repository changed since you opened it — reload and re-apply your edits.
        </p>
      </div>

      <p v-if="saved" class="ok">Saved.</p>

      <div class="actions">
        <button class="btn primary" type="submit" :disabled="saving">
          {{ saving ? "Saving…" : "Save" }}
        </button>
        <RouterLink to="/" class="btn ghost">Back</RouterLink>
      </div>
    </form>
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
  margin: 8px 0 24px;
  font-size: 14px;
  color: var(--ink-2);
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
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
</style>
