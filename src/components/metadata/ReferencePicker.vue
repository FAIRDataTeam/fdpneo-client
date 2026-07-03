<script setup lang="ts">
/**
 * Reference picker for the DASH reference editors — picks an IRI value from a
 * class lookup (`useInstances`). `instances`/`subclass` render a dropdown of the
 * class's instances/subclasses; `autocomplete` adds a search box that filters
 * server-side. The current value stays selectable even if it's not in the page.
 */
import { computed, ref, toRef } from "vue";
import { useInstances, type RefWidget } from "@/composables/useInstances";

const props = defineProps<{
  classIri: string;
  widget: RefWidget;
  modelValue: string;
  required?: boolean;
  label: string;
}>();
const emit = defineEmits<{ (e: "update:modelValue", v: string): void }>();

const query = ref("");
const { items, isLoading } = useInstances(toRef(props, "classIri"), toRef(props, "widget"), query);

const options = computed(() => {
  const list = items.value;
  if (props.modelValue && !list.some((i) => i.iri === props.modelValue)) {
    return [{ iri: props.modelValue, label: props.modelValue }, ...list];
  }
  return list;
});
</script>

<template>
  <div class="ref">
    <input
      v-if="widget === 'autocomplete'"
      v-model="query"
      type="text"
      class="ref__control"
      placeholder="search…"
      :aria-label="`${label} search`"
    />
    <select
      class="ref__control"
      :value="modelValue"
      :required="!!required"
      :aria-label="label"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">—</option>
      <option v-for="o in options" :key="o.iri" :value="o.iri">{{ o.label }}</option>
    </select>
    <span v-if="isLoading" class="ref__hint">loading…</span>
  </div>
</template>

<style scoped>
.ref {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ref__control {
  font-family: var(--fair-font-sans);
  font-size: 14px;
  padding: 10px 12px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  background: var(--fair-bg);
  color: var(--fair-text-strong);
  width: 100%;
  box-sizing: border-box;
}
.ref__hint {
  font-size: 11px;
  color: var(--fair-text-muted);
}
</style>
