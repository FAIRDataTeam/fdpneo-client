<script setup lang="ts">
import { reactive } from 'vue';
import type { Prefix } from '../types';
import { useI18n } from '../composables/useI18n';
import Icon from './Icon.vue';

const { t } = useI18n();

interface Props {
  prefixes: Prefix[];
  used?: string[];
}
const props = defineProps<Props>();
const emit = defineEmits<{ change: [v: Prefix[]] }>();

const draft = reactive({ prefix: '', uri: '' });

function add() {
  if (!draft.prefix.trim() || !draft.uri.trim()) return;
  emit('change', [
    ...props.prefixes,
    { prefix: draft.prefix.trim(), uri: draft.uri.trim() },
  ]);
  draft.prefix = '';
  draft.uri = '';
}

function remove(i: number) {
  const p = props.prefixes[i];
  if (p && (props.used || []).includes(p.prefix) &&
      !window.confirm(t('prefixes.removeUsedConfirm', { prefix: p.prefix }))) {
    return;
  }
  const next = props.prefixes.slice();
  next.splice(i, 1);
  emit('change', next);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    add();
  }
}
</script>

<template>
  <div class="form-row">
    <label>{{ t('prefixes.label') }}</label>
    <div class="prefix-table">
      <div v-for="(p, i) in prefixes" :key="i" class="prefix-row">
        <div class="prefix-row__ns">{{ p.prefix }}:</div>
        <div class="prefix-row__uri">{{ p.uri }}</div>
        <button
          class="btn btn-danger-ghost btn-xs"
          :title="t('prefixes.remove')"
          @click="remove(i)"
        >
          <Icon name="x" :size="11" />
        </button>
      </div>
      <div class="prefix-row--draft">
        <input v-model="draft.prefix" placeholder="ns" />
        <input v-model="draft.uri" placeholder="http://…" @keydown="onKey" />
        <button class="btn btn-secondary btn-xs" @click="add">
          <Icon name="plus" :size="11" />
        </button>
      </div>
    </div>
  </div>
</template>
