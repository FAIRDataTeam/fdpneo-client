<script setup lang="ts">
/**
 * Single-value text/IRI input with server-backed suggestions (TASKS 10.6).
 *
 * Uses a native `<datalist>` (accessible, dependency-free, consistent with the
 * plain inputs in `EntityForm`). As the user types, the prefix is debounced and
 * fed to `useAutocomplete(source, prefix)`; each suggestion's IRI becomes the
 * option value and its label the visible hint. Suggestions are advisory — the
 * field remains free-text and a failed/missing source simply yields none.
 */
import { computed, ref, watch, useId } from "vue";
import { useAutocomplete } from "@/composables/useAutocomplete";

const props = defineProps<{
  source: string;
  type?: "text" | "url";
  required?: boolean;
  placeholder?: string;
  ariaLabel: string;
}>();
const model = defineModel<string>({ required: true });

const listId = useId();
const sourceRef = computed(() => props.source);
const prefix = ref(model.value ?? "");

// Debounce the prefix the query keys on, so typing doesn't fire a request per
// keystroke. The bound model updates immediately; only the lookup is delayed.
let timer: ReturnType<typeof setTimeout> | undefined;
watch(model, (v) => {
  clearTimeout(timer);
  timer = setTimeout(() => (prefix.value = v ?? ""), 200);
});

const { items } = useAutocomplete(sourceRef, prefix);
</script>

<template>
  <input
    :type="props.type ?? 'text'"
    :value="model"
    :required="props.required"
    :placeholder="props.placeholder"
    :aria-label="props.ariaLabel"
    :list="listId"
    autocomplete="off"
    @input="model = ($event.target as HTMLInputElement).value"
  />
  <datalist :id="listId">
    <option v-for="item in items" :key="item.iri" :value="item.iri">
      {{ item.label }}
    </option>
  </datalist>
</template>
