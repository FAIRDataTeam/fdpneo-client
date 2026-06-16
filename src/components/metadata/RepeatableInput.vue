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
import { computed } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import { parseKeywords } from "@/api/entityForms";

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    label: string;
    type?: "text" | "url";
    placeholder?: string;
    minCount?: number;
    maxCount?: number;
  }>(),
  { type: "text", placeholder: "", minCount: 0, maxCount: Number.POSITIVE_INFINITY },
);

const emit = defineEmits<{ (e: "update:modelValue", value: string[]): void }>();

const canAdd = computed(() => props.modelValue.length < props.maxCount);
const canRemove = computed(() => props.modelValue.length > props.minCount);

function setAt(i: number, v: string) {
  const next = [...props.modelValue];
  next[i] = v;
  emit("update:modelValue", next);
}

function removeAt(i: number) {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, j) => j !== i),
  );
}

function add() {
  emit("update:modelValue", [...props.modelValue, ""]);
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
  emit("update:modelValue", next);
}
</script>

<template>
  <div class="repeatable">
    <div v-for="(val, i) in modelValue" :key="i" class="row">
      <input
        :type="type === 'url' ? 'url' : 'text'"
        :value="val"
        :placeholder="placeholder"
        :aria-label="`${label} (value ${i + 1})`"
        @input="setAt(i, ($event.target as HTMLInputElement).value)"
        @paste="onPaste($event, i)"
      />
      <button
        v-if="canRemove"
        type="button"
        class="remove"
        :aria-label="`Remove ${label} value ${i + 1}`"
        @click="removeAt(i)"
      >
        <AppIcon name="x" :size="14" />
      </button>
    </div>

    <button v-if="canAdd" type="button" class="add" :aria-label="`Add ${label}`" @click="add">
      <AppIcon name="plus" :size="14" />
      <span>{{ modelValue.length ? "Add another" : "Add" }}</span>
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
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--muted);
  cursor: pointer;
}
.remove:hover {
  color: var(--signal);
  border-color: var(--signal);
}
.add {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-2);
  background: none;
  color: var(--accent);
  font-family: var(--font-sans);
  font-size: 13px;
  cursor: pointer;
}
.add:hover {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}
</style>
