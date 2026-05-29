<script setup lang="ts">
/**
 * Edit the FDP repository (root) metadata.
 *
 * Read-modify-write: read the root graph as Turtle (capturing its ETag),
 * mutate only the edited predicates on the repository subject, then PUT the
 * whole graph back with `If-Match` so unrelated triples (type, rights/offer)
 * are preserved and concurrent edits are detected.
 *
 * Gated to stewards/admins; the server enforces the same via the bundled
 * offer (steward-modify), so this is a UX guard, not the security boundary.
 */
import { onMounted, ref } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import type { Store } from "n3";
import { useAuthStore } from "@/stores/auth";
import { readGraph, putGraph } from "@/api/records";
import { apiBase, NS, one, parseTurtle, serializeTurtle, setIri, setLiteral } from "@/api/rdf";
import { parseFdpError, type ParsedError } from "@/api/errors";

const auth = useAuthStore();
const queryClient = useQueryClient();

const iri = apiBase();

const loading = ref(true);
const saving = ref(false);
const error = ref<ParsedError | null>(null);
const saved = ref(false);

const title = ref("");
const description = ref("");
const publisher = ref("");

let store: Store | null = null;
let etag: string | null = null;

onMounted(async () => {
  if (!auth.isSteward) {
    loading.value = false;
    return;
  }
  try {
    const { turtle, etag: tag } = await readGraph("");
    etag = tag;
    store = parseTurtle(turtle);
    title.value = one(store, iri, `${NS.dct}title`) ?? "";
    description.value = one(store, iri, `${NS.dct}description`) ?? "";
    publisher.value = one(store, iri, `${NS.dct}publisher`) ?? "";
  } catch (e) {
    error.value = parseFdpError(e);
  } finally {
    loading.value = false;
  }
});

async function save() {
  if (!store || saving.value) return;
  if (!title.value.trim()) {
    error.value = {
      title: "Title is required",
      message: "The repository must have a title.",
      code: "client.validation",
      status: null,
      docsUrl: null,
      violations: [],
      fromServer: false,
    };
    return;
  }
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    setLiteral(store, iri, `${NS.dct}title`, title.value);
    setLiteral(store, iri, `${NS.dct}description`, description.value);
    setIri(store, iri, `${NS.dct}publisher`, publisher.value);
    const turtle = await serializeTurtle(store);
    etag = await putGraph("", turtle, etag);
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

    <form v-else class="form" @submit.prevent="save">
      <label class="field">
        <span class="label">Title <span class="req">*</span></span>
        <input v-model="title" type="text" required aria-label="Repository title" />
      </label>

      <label class="field">
        <span class="label">Description</span>
        <textarea v-model="description" rows="4" aria-label="Repository description" />
      </label>

      <label class="field">
        <span class="label">Publisher (IRI)</span>
        <input
          v-model="publisher"
          type="url"
          placeholder="https://example.org/org"
          aria-label="Publisher IRI"
        />
      </label>

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
  gap: 18px;
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
.req {
  color: var(--signal);
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
  resize: vertical;
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
  margin-top: 4px;
}
</style>
