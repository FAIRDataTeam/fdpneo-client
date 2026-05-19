<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: "update:modelValue", v: string): void }>();

const editing = ref(false);
const draft = ref(props.modelValue);
const inputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.modelValue,
  (v) => {
    if (!editing.value) draft.value = v;
  },
);

async function enter() {
  editing.value = true;
  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
}

function commit() {
  editing.value = false;
  if (draft.value !== props.modelValue) emit("update:modelValue", draft.value);
}

function cancel() {
  draft.value = props.modelValue;
  editing.value = false;
}
</script>

<template>
  <div class="wrap" @click="!editing && enter()">
    <h1 v-if="!editing">{{ modelValue }}</h1>
    <input
      v-else
      ref="inputRef"
      v-model="draft"
      class="input-title"
      aria-label="Record title"
      @keydown.enter.prevent="commit"
      @keydown.escape="cancel"
      @blur="commit"
    />
    <div class="badge mono"><AppIcon name="edit" :size="10" /> dct:title</div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  margin: 0 -10px 14px;
  padding: 6px 10px;
  border: 1px dashed transparent;
  border-radius: 8px;
  cursor: text;
}
.wrap:hover {
  border-color: var(--line-strong);
}
h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 38px;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.input-title {
  width: 100%;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 38px;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--ink);
  background: transparent;
  border: 0;
  outline: 0;
}
.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 3px 6px;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  font-weight: 500;
  font-size: 10px;
  line-height: 1;
  color: var(--muted);
}
</style>
