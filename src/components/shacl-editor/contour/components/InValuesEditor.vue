<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '../composables/useI18n';
import type { InValue } from '../types';
import Icon from './Icon.vue';

const { t } = useI18n();

interface Props {
  values: InValue[] | null;
}
const props = defineProps<Props>();
const emit = defineEmits<{ change: [v: InValue[] | null] }>();

const input = ref('');
const kind = ref<'literal' | 'iri'>('literal');
const items = computed<InValue[]>(() => props.values || []);

function addItem() {
  if (!input.value.trim()) return;
  emit('change', [...items.value, { value: input.value.trim(), kind: kind.value }]);
  input.value = '';
}

function removeItem(i: number) {
  const next = items.value.slice();
  next.splice(i, 1);
  emit('change', next.length ? next : null);
}

function toggleKind(i: number) {
  const next = items.value.map((v, idx) => {
    if (idx !== i) return v;
    const kind: InValue['kind'] = v.kind === 'iri' ? 'literal' : 'iri';
    return { ...v, kind };
  });
  emit('change', next);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    addItem();
  }
}
</script>

<template>
  <div class="form-row">
    <label>{{ t('inValues.label') }}</label>
    <div class="tag-row">
      <span v-for="(v, i) in items" :key="i" class="tag" :class="{ 'tag--iri': v.kind === 'iri' }">
        <button
          class="tag__kind"
          type="button"
          :title="t('inValues.toggleKind')"
          @click="toggleKind(i)"
        >{{ v.kind === 'iri' ? t('inValues.iri') : t('inValues.literal') }}</button>
        {{ v.value }}
        <button @click="removeItem(i)"><Icon name="x" :size="11" /></button>
      </span>
    </div>
    <div class="inval-add">
      <input
        v-model="input"
        :placeholder="t('inValues.placeholder')"
        @keydown="onKey"
      />
      <select v-model="kind" :title="t('inValues.kind')">
        <option value="literal">{{ t('inValues.literal') }}</option>
        <option value="iri">{{ t('inValues.iri') }}</option>
      </select>
      <button class="btn btn-secondary btn-sm" :title="t('inValues.add')" :disabled="!input.trim()" @click="addItem">
        <Icon name="plus" :size="13" />
      </button>
    </div>
    <div class="hint">{{ t('inValues.hint') }}</div>
  </div>
</template>
