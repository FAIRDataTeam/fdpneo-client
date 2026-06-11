<script setup lang="ts">
/**
 * "View as RDF" — serialization links for the record on display.
 *
 * One component used by both the record sidecar and the repository hero, so the
 * box is consistent everywhere. Each button fetches the record through content
 * negotiation (`Accept:` header) and opens the result in a new tab; a plain link
 * can't set Accept and the server doesn't honour `?format=`.
 *
 * (No per-record "API" link: the OpenAPI spec documents no per-resource GET
 * operation to deep-link to, and the footer already links the OpenAPI UI.)
 *
 * `recordId` is the record's path id ("" for the repository root).
 */
import { ref } from "vue";
import { http } from "@/api/http";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = withDefaults(defineProps<{ recordId?: string }>(), { recordId: "" });

const FORMATS = [
  { label: "Turtle", accept: "text/turtle" },
  { label: "JSON-LD", accept: "application/ld+json" },
  { label: "RDF/XML", accept: "application/rdf+xml" },
  { label: "N-Triples", accept: "application/n-triples" },
] as const;

const open = ref(true);
const busy = ref<string | null>(null);

async function view(fmt: (typeof FORMATS)[number]) {
  if (busy.value) return;
  busy.value = fmt.label;
  try {
    const path = props.recordId ? `/${props.recordId}` : "/";
    const res = await http.get<string>(path, {
      headers: { Accept: fmt.accept },
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    const blob = new Blob([res.data], { type: fmt.accept });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    // Give the new tab time to read the blob before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    // A failed fetch just leaves the panel as-is.
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <section class="rdf">
    <button
      type="button"
      class="head"
      :aria-expanded="open"
      aria-controls="rdf-body"
      @click="open = !open"
    >
      <span class="label">View as RDF</span>
      <AppIcon :name="open ? 'chevron-d' : 'chevron-r'" :size="14" color="var(--muted)" />
    </button>
    <div v-if="open" id="rdf-body" class="grid">
      <button
        v-for="f in FORMATS"
        :key="f.label"
        type="button"
        class="btn sm"
        :disabled="busy !== null"
        @click="view(f)"
      >
        {{ busy === f.label ? "Opening…" : f.label }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.rdf {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: var(--ink-2);
}
.label {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 12px;
  line-height: 1;
  color: var(--ink-2);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.grid .btn {
  width: 100%;
  justify-content: center;
  height: 28px;
}
.grid .api {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}
</style>
