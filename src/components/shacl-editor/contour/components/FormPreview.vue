<script setup lang="ts">
import { computed } from 'vue';
import type { Schema } from '../types';
import { useI18n } from '../composables/useI18n';
import PreviewField from './PreviewField.vue';

const { t } = useI18n();

interface Props {
  schema: Schema;
}
const props = defineProps<Props>();

const sortedGroups = computed(() =>
  props.schema.groups.slice().sort((a, b) => a.order - b.order),
);
</script>

<template>
  <div class="form-preview">
    <div
      v-if="sortedGroups.length === 0"
      style="color: var(--color-text-lighter); text-align: center; padding: 30px"
    >
      {{ t('formPreview.empty') }}
    </div>
    <div v-for="g in sortedGroups" :key="g.id">
      <div class="form-preview__group-title">{{ g.label }}</div>
      <PreviewField v-for="f in g.fields" :key="f.id" :field="f" :schema="schema" />
    </div>
  </div>
</template>
