<script setup lang="ts">
// Edits sh:or "alternative value types" — a list where each branch fixes one of
// sh:nodeKind / sh:datatype / sh:class. Covers the common "literal or IRI" and
// "string or date" patterns; richer sh:or stays in the residual graph.
import { computed, reactive } from 'vue';
import { DATATYPES, NODE_KINDS } from '../data';
import { useI18n } from '../composables/useI18n';
import type { OrType } from '../types';
import Icon from './Icon.vue';

const { t } = useI18n();

const props = defineProps<{ values: OrType[] | undefined }>();
const emit = defineEmits<{ change: [v: OrType[] | undefined] }>();

const items = computed<OrType[]>(() => props.values || []);
const draft = reactive<{ kind: 'nodeKind' | 'datatype' | 'class'; value: string }>({ kind: 'datatype', value: '' });

function describe(ot: OrType): string {
  if (ot.nodeKind) return ot.nodeKind;
  if (ot.datatype) return ot.datatype;
  if (ot.class) return `class ${ot.class}`;
  return '?';
}

function add() {
  const v = draft.value.trim();
  if (!v) return;
  const ot: OrType = draft.kind === 'nodeKind' ? { nodeKind: v } : draft.kind === 'class' ? { class: v } : { datatype: v };
  emit('change', [...items.value, ot]);
  draft.value = '';
}
function remove(i: number) {
  const next = items.value.slice();
  next.splice(i, 1);
  emit('change', next.length ? next : undefined);
}
</script>

<template>
  <div class="form-row">
    <label>{{ t('inspector.label.orTypes') }}</label>
    <div class="tag-row">
      <span v-for="(ot, i) in items" :key="i" class="tag">
        {{ describe(ot) }}
        <button @click="remove(i)"><Icon name="x" :size="11" /></button>
      </span>
    </div>
    <div class="form-row-2" style="margin-top: 6px">
      <select v-model="draft.kind">
        <option value="datatype">sh:datatype</option>
        <option value="nodeKind">sh:nodeKind</option>
        <option value="class">sh:class</option>
      </select>
      <input
        v-if="draft.kind === 'datatype'"
        v-model="draft.value"
        list="ortype-datatypes"
        class="mono"
        placeholder="xsd:string"
        @keydown.enter.prevent="add"
      />
      <select v-else-if="draft.kind === 'nodeKind'" v-model="draft.value">
        <option value="">—</option>
        <option v-for="o in NODE_KINDS" :key="o" :value="o">{{ o }}</option>
      </select>
      <input v-else v-model="draft.value" class="mono" placeholder="foaf:Agent" @keydown.enter.prevent="add" />
    </div>
    <datalist id="ortype-datatypes">
      <option v-for="o in DATATYPES" :key="o" :value="o" />
    </datalist>
    <button class="btn btn-secondary btn-xs" style="margin-top: 6px" @click="add">
      <Icon name="plus" :size="11" /> {{ t('inspector.addOrType') }}
    </button>
    <div class="hint">{{ t('inspector.hint.orTypes') }}</div>
  </div>
</template>
