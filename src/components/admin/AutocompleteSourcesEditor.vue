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
import { useI18n } from "vue-i18n";
import type { SettingValue } from "@/api/settings";
import AppIcon from "@/components/shared/AppIcon.vue";

const { t } = useI18n();

type Kind = "inline" | "sparql";

// `_id` is a stable per-row key for v-for — never emitted (the watch maps to a
// clean shape). Keying by array index binds focus/inputs to the wrong row after
// a mid-list remove.
interface ItemEdit {
  _id: string;
  iri: string;
  label: string;
  aliasesText: string;
}
interface SourceEdit {
  _id: string;
  name: string;
  kind: Kind;
  description: string;
  items: ItemEdit[];
  sparql: string;
}

let rowUid = 0;
const nextRowId = (): string => `row-${rowUid++}`;

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
      _id: nextRowId(),
      name: str(s.name),
      kind: s.kind === "sparql" ? "sparql" : "inline",
      description: str(s.description),
      items: rawItems.map((rawIt) => {
        const it = (rawIt ?? {}) as Record<string, unknown>;
        return { _id: nextRowId(), iri: str(it.iri), label: str(it.label), aliasesText: rawAliases(it) };
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
  sources.push({ _id: nextRowId(), name: "", kind: "inline", description: "", items: [], sparql: "" });
}
function removeSource(i: number) {
  sources.splice(i, 1);
}
function addItem(s: SourceEdit) {
  s.items.push({ _id: nextRowId(), iri: "", label: "", aliasesText: "" });
}
function removeItem(s: SourceEdit, i: number) {
  s.items.splice(i, 1);
}
</script>

<template>
  <div class="sources">
    <p v-if="!sources.length" class="empty">{{ t("settingsAdmin.sourcesEmpty") }}</p>

    <section v-for="(s, si) in sources" :key="s._id" class="source">
      <header class="source__head">
        <label class="field grow">
          <span class="lbl">{{ t("settingsAdmin.sourceName") }}</span>
          <input v-model="s.name" :disabled="!canEdit" :placeholder="t('settingsAdmin.sourceNamePlaceholder')" />
        </label>
        <label class="field">
          <span class="lbl">{{ t("settingsAdmin.sourceKind") }}</span>
          <select v-model="s.kind" :disabled="!canEdit">
            <option value="inline">inline</option>
            <option value="sparql">sparql</option>
          </select>
        </label>
        <button
          v-if="canEdit"
          type="button"
          class="btn ghost sm remove"
          :aria-label="t('settingsAdmin.sourceRemoveAria')"
          @click="removeSource(si)"
        >
          <AppIcon name="x" :size="12" />
        </button>
      </header>

      <label class="field">
        <span class="lbl">{{ t("settingsAdmin.sourceDescription") }} <span class="opt">{{ t("settingsAdmin.optional") }}</span></span>
        <input v-model="s.description" :disabled="!canEdit" :placeholder="t('settingsAdmin.sourceDescriptionPlaceholder')" />
      </label>

      <!-- inline: an items table -->
      <div v-if="s.kind === 'inline'" class="items">
        <div v-for="(it, ii) in s.items" :key="it._id" class="item">
          <label class="field grow">
            <span class="lbl">{{ t("settingsAdmin.itemIri") }}</span>
            <input v-model="it.iri" :disabled="!canEdit" class="mono" :placeholder="t('settingsAdmin.itemIriPlaceholder')" />
          </label>
          <label class="field grow">
            <span class="lbl">{{ t("settingsAdmin.itemLabel") }}</span>
            <input v-model="it.label" :disabled="!canEdit" :placeholder="t('settingsAdmin.itemLabelPlaceholder')" />
          </label>
          <label class="field grow">
            <span class="lbl">{{ t("settingsAdmin.itemAliases") }} <span class="opt">{{ t("settingsAdmin.itemAliasesHint") }}</span></span>
            <input v-model="it.aliasesText" :disabled="!canEdit" :placeholder="t('settingsAdmin.itemAliasesPlaceholder')" />
          </label>
          <button
            v-if="canEdit"
            type="button"
            class="btn ghost sm remove"
            :aria-label="t('settingsAdmin.itemRemoveAria')"
            @click="removeItem(s, ii)"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </div>
        <button v-if="canEdit" type="button" class="btn sm add" @click="addItem(s)">
          <AppIcon name="plus" :size="12" /> {{ t("settingsAdmin.itemAdd") }}
        </button>
      </div>

      <!-- sparql: a query field -->
      <label v-else class="field">
        <span class="lbl">{{ t("settingsAdmin.sourceSparqlLabel") }}</span>
        <textarea
          v-model="s.sparql"
          :disabled="!canEdit"
          class="mono"
          rows="4"
          :placeholder="t('settingsAdmin.sourceSparqlPlaceholder')"
        />
      </label>
    </section>

    <button v-if="canEdit" type="button" class="btn sm add" @click="addSource">
      <AppIcon name="plus" :size="12" /> {{ t("settingsAdmin.sourceAdd") }}
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
  color: var(--fair-text-muted);
}
.source {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  background: var(--fair-bg);
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
  border-left: 2px solid var(--fair-separator);
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
  color: var(--fair-text-muted);
}
.opt {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
input,
select,
textarea {
  font-family: var(--fair-font-sans);
  font-size: 13px;
  padding: 7px 9px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-sm);
  background: var(--fair-surface);
  color: var(--fair-text-strong);
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
