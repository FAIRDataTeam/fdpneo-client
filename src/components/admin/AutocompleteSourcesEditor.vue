<script setup lang="ts">
/**
 * Structured editor for the `forms.autocomplete-sources` setting. Mirrors the
 * server `AutocompleteSources` shape:
 *   { sources: [{ name, kind: "inline"|"sparql", description,
 *                 items: [{ iri, label, aliases: [] }], sparql }] }
 *
 * Aliases are edited as a comma-separated string for convenience and split on
 * write. The whole value is written back through `v-model` on every change.
 */
import { reactive, watch } from "vue";
import type { SettingValue } from "@/api/settings";
import AppIcon from "@/components/shared/AppIcon.vue";

type Kind = "inline" | "sparql";

interface ItemEdit {
  iri: string;
  label: string;
  aliasesText: string;
}
interface SourceEdit {
  name: string;
  kind: Kind;
  description: string;
  items: ItemEdit[];
  sparql: string;
}

// The setting value is an open object at the API boundary; we read/write the
// concrete `{ sources: [...] }` shape with runtime guards.
const model = defineModel<SettingValue>({ required: true });
defineProps<{ canEdit: boolean }>();

const str = (v: unknown): string => (typeof v === "string" ? v : "");

const initial: unknown[] = Array.isArray(model.value.sources) ? model.value.sources : [];
const sources = reactive<SourceEdit[]>(
  initial.map((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const rawItems: unknown[] = Array.isArray(s.items) ? s.items : [];
    const rawAliases = (it: Record<string, unknown>): string =>
      Array.isArray(it.aliases) ? it.aliases.map(str).filter(Boolean).join(", ") : "";
    return {
      name: str(s.name),
      kind: s.kind === "sparql" ? "sparql" : "inline",
      description: str(s.description),
      items: rawItems.map((rawIt) => {
        const it = (rawIt ?? {}) as Record<string, unknown>;
        return { iri: str(it.iri), label: str(it.label), aliasesText: rawAliases(it) };
      }),
      sparql: str(s.sparql),
    };
  }),
);

function splitAliases(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

watch(
  sources,
  () => {
    model.value = {
      sources: sources.map((s) => ({
        name: s.name,
        kind: s.kind,
        description: s.description.trim() ? s.description.trim() : null,
        items: s.items.map((it) => ({
          iri: it.iri,
          label: it.label,
          aliases: splitAliases(it.aliasesText),
        })),
        sparql: s.sparql.trim() ? s.sparql : null,
      })),
    };
  },
  { deep: true },
);

function addSource() {
  sources.push({ name: "", kind: "inline", description: "", items: [], sparql: "" });
}
function removeSource(i: number) {
  sources.splice(i, 1);
}
function addItem(s: SourceEdit) {
  s.items.push({ iri: "", label: "", aliasesText: "" });
}
function removeItem(s: SourceEdit, i: number) {
  s.items.splice(i, 1);
}
</script>

<template>
  <div class="sources">
    <p v-if="!sources.length" class="empty">No sources configured.</p>

    <section v-for="(s, si) in sources" :key="si" class="source">
      <header class="source__head">
        <label class="field grow">
          <span class="lbl">Name</span>
          <input v-model="s.name" :disabled="!canEdit" placeholder="license" />
        </label>
        <label class="field">
          <span class="lbl">Kind</span>
          <select v-model="s.kind" :disabled="!canEdit">
            <option value="inline">inline</option>
            <option value="sparql">sparql</option>
          </select>
        </label>
        <button
          v-if="canEdit"
          type="button"
          class="btn ghost sm remove"
          aria-label="Remove source"
          @click="removeSource(si)"
        >
          <AppIcon name="x" :size="12" />
        </button>
      </header>

      <label class="field">
        <span class="lbl">Description <span class="opt">(optional)</span></span>
        <input v-model="s.description" :disabled="!canEdit" placeholder="Common open licenses" />
      </label>

      <!-- inline: an items table -->
      <div v-if="s.kind === 'inline'" class="items">
        <div v-for="(it, ii) in s.items" :key="ii" class="item">
          <label class="field grow">
            <span class="lbl">IRI</span>
            <input v-model="it.iri" :disabled="!canEdit" class="mono" placeholder="https://…" />
          </label>
          <label class="field grow">
            <span class="lbl">Label</span>
            <input v-model="it.label" :disabled="!canEdit" placeholder="CC BY 4.0" />
          </label>
          <label class="field grow">
            <span class="lbl">Aliases <span class="opt">(comma-separated)</span></span>
            <input v-model="it.aliasesText" :disabled="!canEdit" placeholder="CC BY, CC-BY-4.0" />
          </label>
          <button
            v-if="canEdit"
            type="button"
            class="btn ghost sm remove"
            aria-label="Remove item"
            @click="removeItem(s, ii)"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </div>
        <button v-if="canEdit" type="button" class="btn sm add" @click="addItem(s)">
          <AppIcon name="plus" :size="12" /> Add item
        </button>
      </div>

      <!-- sparql: a query field -->
      <label v-else class="field">
        <span class="lbl">SPARQL (must project ?iri and ?label)</span>
        <textarea
          v-model="s.sparql"
          :disabled="!canEdit"
          class="mono"
          rows="4"
          placeholder="SELECT ?iri ?label WHERE { … }"
        />
      </label>
    </section>

    <button v-if="canEdit" type="button" class="btn sm add" @click="addSource">
      <AppIcon name="plus" :size="12" /> Add source
    </button>
  </div>
</template>

<style scoped>
.sources {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.empty {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
.source {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--paper);
}
.source__head {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 12px;
  border-left: 2px solid var(--line);
}
.item {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}
.field.grow {
  flex: 1;
  min-width: 160px;
}
.lbl {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.opt {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
input,
select,
textarea {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 7px 9px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-1);
  background: var(--surface);
  color: var(--ink);
}
.mono {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
}
textarea {
  resize: vertical;
}
.remove {
  margin-bottom: 1px;
}
.add {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
