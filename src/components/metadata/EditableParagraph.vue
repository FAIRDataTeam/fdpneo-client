<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: "update:modelValue", v: string): void }>();

const draft = ref(props.modelValue);

watch(
  () => props.modelValue,
  (v) => (draft.value = v),
);

function apply() {
  if (draft.value !== props.modelValue) emit("update:modelValue", draft.value);
}
function cancel() {
  draft.value = props.modelValue;
}
</script>

<template>
  <div class="wrap">
    <textarea v-model="draft" aria-label="Description" rows="3" />
    <div class="foot">
      <span class="mono">dct:description · en</span>
      <span>·</span>
      <span>{{ draft.length }} / 1000 characters</span>
      <div class="spacer" />
      <button class="btn ghost sm" @click="cancel">Cancel</button>
      <button class="btn accent sm" @click="apply">Apply</button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  margin: 0 -10px;
  padding: 10px;
  border: 1px solid var(--accent-line);
  border-radius: 8px;
  background: var(--accent-soft);
}
textarea {
  width: 100%;
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink-2);
  background: transparent;
  border: 0;
  outline: 0;
  resize: vertical;
}
.foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--accent-line);
  font-size: 11px;
  color: var(--muted);
}
.spacer {
  flex: 1;
}
</style>
