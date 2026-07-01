<script setup lang="ts">
import { computed } from 'vue';
import { WIDGET_BY_ID } from '../data';
import { useI18n } from '../composables/useI18n';
import type { Field } from '../types';
import Icon from './Icon.vue';
import WidgetIcon from './WidgetIcon.vue';

const { t } = useI18n();

interface Props {
  field: Field;
  isSelected: boolean;
  isDragging: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  select: [];
  delete: [];
  duplicate: [];
  dragstart: [e: DragEvent];
  dragend: [];
}>();

const widget = computed(
  () => WIDGET_BY_ID[props.field.widgetId] ?? WIDGET_BY_ID['TextFieldEditor']!,
);
const required = computed(() => (props.field.minCount || 0) > 0);
const multi = computed(() => {
  const mc = props.field.maxCount;
  return mc === null || mc === undefined || mc > 1;
});
const typeLabel = computed(() => {
  const f = props.field;
  if (f.widgetId === 'DetailsEditor' && f.node) return `→ ${f.node}`;
  return (
    f.datatype ||
    f.class ||
    f.nodeKind ||
    widget.value.editor.replace('dash:', '')
  );
});

function handleClick(e: MouseEvent) {
  e.stopPropagation();
  emit('select');
}
</script>

<template>
  <div
    class="field"
    :class="{ 'is-selected': isSelected, 'is-dragging': isDragging }"
    draggable="true"
    @click="handleClick"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend')"
  >
    <div class="field__grip" @click.stop>
      <Icon name="grip" :size="16" />
    </div>
    <div class="field__icon"><WidgetIcon :char="widget.icon" /></div>
    <div class="field__main">
      <div class="field__name-row">
        <span class="field__name">{{ field.name || t('fieldCard.unnamed') }}</span>
        <span v-if="required" class="field__req" :title="t('fieldCard.required')">●</span>
        <span v-if="multi" class="field__badge">{{ t('fieldCard.multi') }}</span>
      </div>
      <div class="field__meta">
        <span>{{ field.inversePath ? '^' + field.path : field.path }}</span>
        <span>·</span>
        <span v-if="field.orTypes && field.orTypes.length">sh:or</span>
        <span v-else>{{ typeLabel }}</span>
      </div>
    </div>
    <div class="field__actions">
      <button
        class="btn btn-ghost btn-xs"
        :title="t('fieldCard.duplicate')"
        @click.stop="emit('duplicate')"
      >
        <Icon name="duplicate" :size="13" />
      </button>
      <button
        class="btn btn-danger-ghost btn-xs"
        :title="t('fieldCard.delete')"
        @click.stop="emit('delete')"
      >
        <Icon name="trash" :size="13" />
      </button>
    </div>
  </div>
</template>
