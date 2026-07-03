<script setup lang="ts">
/**
 * Editor for a multi-valued property (`keywords` / `iris` field kinds): one
 * input per value, with a per-row remove (×) and an "Add" (+) button, gated on
 * the field's `sh:minCount` / `sh:maxCount`. Replaces the old single
 * comma-joined input, whose parse→join round-trip ate commas mid-typing
 * (TASKS 17.1).
 *
 * The bound model is a plain `string[]`; empty entries are harmless — the RDF
 * serializers (`setLiterals` / `setIris`) trim and drop blanks on save.
 */
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "@/components/shared/AppIcon.vue";
import { parseKeywords } from "@/api/entityForms";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    label: string;
    type?: "text" | "url";
    placeholder?: string;
    // Allow explicit `undefined` (exactOptionalPropertyTypes) so callers can
    // forward an absent FieldSpec.minCount/maxCount; withDefaults fills them.
    minCount?: number | undefined;
    maxCount?: number | undefined;
  }>(),
  { type: "text", placeholder: "", minCount: 0, maxCount: Number.POSITIVE_INFINITY },
);

const emit = defineEmits<{ (e: "update:modelValue", value: string[]): void }>();

const canAdd = computed(() => props.modelValue.length < props.maxCount);
const canRemove = computed(() => props.modelValue.length > props.minCount);

// Stable per-row keys. The model is a bare `string[]` (values can repeat or be
// empty), so the v-for can't key by value, and keying by index rebinds focus to
// the wrong <input> when a middle row is removed. Instead we keep an id list in
// lockstep: our own mutations splice ids alongside values; an *external*
// replacement (parent loads/resets the array) is detected via `selfEdit` and
// triggers a fresh reissue.
let uid = 0;
const ids = ref<number[]>(props.modelValue.map(() => uid++));
let selfEdit = false;

/** Emit a new value, flagging it as our own so the watcher leaves `ids` alone. */
function commit(next: string[]) {
  selfEdit = true;
  emit("update:modelValue", next);
}

watch(
  () => props.modelValue,
  (val) => {
    if (selfEdit) {
      selfEdit = false; // our mutation already kept `ids` aligned
      return;
    }
    ids.value = val.map(() => uid++); // external replacement: reissue ids
  },
);

function setAt(i: number, v: string) {
  const next = [...props.modelValue];
  next[i] = v;
  commit(next); // length unchanged → ids stay aligned
}

function removeAt(i: number) {
  ids.value.splice(i, 1);
  commit(props.modelValue.filter((_, j) => j !== i));
}

function add() {
  ids.value.push(uid++);
  commit([...props.modelValue, ""]);
}

// Power-user convenience: pasting comma-separated text explodes into rows
// (mirrors the old "Comma-separated" affordance, now non-lossy). Plain pastes
// fall through to the default single-field behaviour.
function onPaste(e: ClipboardEvent, i: number) {
  const text = e.clipboardData?.getData("text") ?? "";
  if (!text.includes(",")) return;
  const parts = parseKeywords(text);
  if (!parts.length) return;
  e.preventDefault();
  const next = [...props.modelValue];
  next.splice(i, 1, ...parts);
  ids.value.splice(i, 1, ...parts.map(() => uid++));
  commit(next);
}
</script>

<template>
  <div class="repeatable">
    <div v-for="(val, i) in modelValue" :key="ids[i]" class="row">
      <input
        :type="type === 'url' ? 'url' : 'text'"
        :value="val"
        :placeholder="placeholder"
        :aria-label="t('repeatableInput.valueAria', { label, n: i + 1 })"
        @input="setAt(i, ($event.target as HTMLInputElement).value)"
        @paste="onPaste($event, i)"
      />
      <button
        v-if="canRemove"
        type="button"
        class="remove"
        :aria-label="t('repeatableInput.removeAria', { label, n: i + 1 })"
        @click="removeAt(i)"
      >
        <AppIcon name="x" :size="14" />
      </button>
    </div>

    <button v-if="canAdd" type="button" class="add" :aria-label="t('repeatableInput.addAria', { label })" @click="add">
      <AppIcon name="plus" :size="14" />
      <span>{{ modelValue.length ? t("repeatableInput.addAnother") : t("repeatableInput.add") }}</span>
    </button>
  </div>
</template>

<style scoped>
.repeatable {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row input {
  flex: 1;
  /* inherits the form's input styling from the parent scope's global rules */
}
.remove {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  background: var(--fair-bg);
  color: var(--fair-text-muted);
  cursor: pointer;
}
.remove:hover {
  color: var(--fair-warning);
  border-color: var(--fair-warning);
}
.add {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px dashed var(--fair-border);
  border-radius: var(--fair-radius-md);
  background: none;
  color: var(--tool-accent);
  font-family: var(--fair-font-sans);
  font-size: 13px;
  cursor: pointer;
}
.add:hover {
  border-color: var(--fair-node-soft);
  background: var(--tool-accent-tint);
}
</style>
