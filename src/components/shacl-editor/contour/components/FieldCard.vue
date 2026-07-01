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
  /** Server sample-validation messages whose path matched this field (19.8a). */
  violations?: string[] | undefined;
}
const props = defineProps<Props>();
const hasViolations = computed(() => (props.violations?.length ?? 0) > 0);

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
    :class="{ 'is-selected': isSelected, 'is-dragging': isDragging, 'has-violation': hasViolations }"
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
      <div v-if="hasViolations" class="field__violation" :title="violations!.join('\n')">
        <Icon name="warning" :size="12" />
        <span>{{ violations![0] }}</span>
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

<style scoped>
/* Sample-validation annotation (19.8a). Base `.field` styling lives in editor.css. */
.field.has-violation {
  border-color: var(--color-danger);
  box-shadow: inset 3px 0 0 var(--color-danger);
}
.field__violation {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  color: var(--color-danger);
  font-size: 11px;
}
.field__violation span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
