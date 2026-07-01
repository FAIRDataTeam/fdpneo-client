<script setup lang="ts">
// Edits a list of language-tagged strings (additional translations of a label),
// each a { lang, value } pair. Emits the full list on every change.
import { computed, reactive } from 'vue';
import { useI18n } from '../composables/useI18n';
import type { LangValue } from '../types';
import Icon from './Icon.vue';

const { t } = useI18n();

interface Props {
  values: LangValue[] | undefined;
  label: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ change: [v: LangValue[] | undefined] }>();

const items = computed<LangValue[]>(() => props.values || []);
const draft = reactive({ lang: '', value: '' });

function add() {
  if (!draft.lang.trim() || !draft.value.trim()) return;
  emit('change', [...items.value, { lang: draft.lang.trim(), value: draft.value.trim() }]);
  draft.lang = '';
  draft.value = '';
}
function remove(i: number) {
  const next = items.value.slice();
  next.splice(i, 1);
  emit('change', next.length ? next : undefined);
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); add(); }
}
</script>

<template>
  <div class="form-row">
    <label>{{ label }}</label>
    <div class="trans-list">
      <div v-for="(it, i) in items" :key="i" class="trans-row">
        <span class="trans-row__lang">{{ it.lang }}</span>
        <span class="trans-row__val">{{ it.value }}</span>
        <button class="btn btn-danger-ghost btn-xs" :title="t('prefixes.remove')" @click="remove(i)">
          <Icon name="x" :size="11" />
        </button>
      </div>
      <div class="trans-row trans-row--draft">
        <input v-model="draft.lang" class="trans-row__lang-input" :placeholder="t('translations.lang')" @keydown="onKey" />
        <input v-model="draft.value" :placeholder="t('translations.value')" @keydown="onKey" />
        <button class="btn btn-secondary btn-xs" @click="add"><Icon name="plus" :size="11" /></button>
      </div>
    </div>
  </div>
</template>
