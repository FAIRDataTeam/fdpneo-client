<script setup lang="ts">
import { computed, ref } from 'vue';
import { WIDGETS } from '../data';
import { useDrag } from '../composables/useDrag';
import { useI18n } from '../composables/useI18n';
import type { Widget } from '../types';
import Icon from './Icon.vue';
import WidgetIcon from './WidgetIcon.vue';

const q = ref('');
const { startPaletteDrag, endDrag } = useDrag();
const { t } = useI18n();
const emit = defineEmits<{ add: [widget: Widget] }>();

const filtered = computed<Widget[]>(() => {
  const needle = q.value.trim().toLowerCase();
  if (!needle) return WIDGETS;
  return WIDGETS.filter((w) => {
    const haystack = [
      w.name,
      w.desc,
      w.editor,
      t(`widget.${w.id}.name`),
      t(`widget.${w.id}.desc`),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
});

const byCategory = computed<Array<[string, Widget[]]>>(() => {
  const m = new Map<string, Widget[]>();
  for (const w of filtered.value) {
    if (!m.has(w.category)) m.set(w.category, []);
    m.get(w.category)!.push(w);
  }
  return [...m.entries()];
});

function onDragStart(e: DragEvent, widget: Widget) {
  startPaletteDrag(e, widget);
}
</script>

<template>
  <div class="panel">
    <div class="panel__header">
      <div>
        <div class="panel__title">{{ t('palette.title') }}</div>
        <div class="panel__subtitle">{{ t('palette.subtitle') }}</div>
      </div>
    </div>
    <div class="palette-search">
      <Icon name="search" :size="14" />
      <input v-model="q" :placeholder="t('palette.search')" />
    </div>
    <div class="panel__body panel__body--snug" style="padding-top: 8px">
      <div v-for="[cat, items] in byCategory" :key="cat" class="palette-cat">
        <div class="palette-cat__label">{{ t(`category.${cat}`) }}</div>
        <div
          v-for="w in items"
          :key="w.id"
          class="palette-item"
          draggable="true"
          role="button"
          tabindex="0"
          :title="t('palette.addTitle', { editor: w.editor })"
          @dragstart="onDragStart($event, w)"
          @dragend="endDrag"
          @click="emit('add', w)"
          @keydown.enter.prevent="emit('add', w)"
          @keydown.space.prevent="emit('add', w)"
        >
          <div class="palette-item__icon"><WidgetIcon :char="w.icon" /></div>
          <div class="palette-item__text">
            <div class="palette-item__name">{{ t(`widget.${w.id}.name`) }}</div>
            <div class="palette-item__desc">{{ t(`widget.${w.id}.desc`) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
