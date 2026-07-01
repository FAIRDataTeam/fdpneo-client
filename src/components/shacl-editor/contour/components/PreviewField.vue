<script setup lang="ts">
// One field in the rendered form preview. Recurses through DetailsEditor →
// nested shape so sub-forms render at any depth. Holds its own value-count and
// tooltip state so repeated instances are independent.
import { computed, ref } from 'vue';
import type { Field, NestedShape, Schema } from '../types';
import { useI18n } from '../composables/useI18n';
import FieldInput from './FieldInput.vue';
import Icon from './Icon.vue';

const props = defineProps<{ field: Field; schema: Schema }>();
const { t } = useI18n();

const tipOpen = ref(false);

const required = computed(() => (props.field.minCount || 0) > 0);
const multi = computed(() => {
  const mc = props.field.maxCount;
  return mc === null || mc === undefined || mc > 1;
});

// Honour the cardinality bounds: start at the minimum (≥1 so something shows),
// never add past maxCount, never remove below minCount.
const minN = computed(() => Math.max(1, props.field.minCount || 0));
const maxN = computed(() => (props.field.maxCount == null ? Infinity : props.field.maxCount));
const count = ref(Math.max(1, props.field.minCount || 0));
const canAdd = computed(() => count.value < maxN.value);
const canRemove = computed(() => count.value > minN.value);
function addValue() { if (count.value < maxN.value) count.value++; }
function removeValue() { if (count.value > minN.value) count.value--; }
const isLangTagged = computed(() =>
  props.field.datatype === 'rdf:langString' || props.field.datatype === 'rdf:HTML',
);

// "1–3", "1+", "0–1" — a compact cardinality hint, shown when bounds are set.
const cardinality = computed(() => {
  const min = props.field.minCount;
  const max = props.field.maxCount;
  if ((min === null || min === undefined) && (max === null || max === undefined)) return '';
  const lo = min ?? 0;
  const hi = max === null || max === undefined ? '∞' : max;
  return `${lo}–${hi}`;
});

const nestedShape = computed<NestedShape | null>(() =>
  props.field.node
    ? (props.schema.nestedShapes || []).find((ns) => ns.iri === props.field.node) ?? null
    : null,
);
const nestedFields = computed<Field[]>(() =>
  (nestedShape.value?.fields || []).slice().sort((a, b) => a.order - b.order),
);

function labelFromPath(path: string): string {
  let local = path;
  if (path.startsWith('<')) {
    const m = path.match(/[#/]([^#/>]+)>?$/);
    local = m?.[1] ?? path.replace(/[<>]/g, '');
  } else {
    const colon = path.indexOf(':');
    if (colon >= 0) local = path.slice(colon + 1);
  }
  return local
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}
</script>

<template>
  <div class="form-row">
    <div class="form-preview__label-row">
      <label :class="{ required }">{{ field.name || labelFromPath(field.path) }}</label>
      <span v-if="cardinality" class="form-preview__card">{{ cardinality }}</span>
      <button
        v-if="field.description"
        class="form-preview__info-btn"
        type="button"
        :class="{ 'is-open': tipOpen }"
        @click.stop="tipOpen = !tipOpen"
      >
        <Icon name="info" :size="13" />
        <span class="form-preview__tooltip">{{ field.description }}</span>
      </button>
    </div>

    <!-- DetailsEditor: render the linked nested shape's fields inline, recursively -->
    <template v-if="field.widgetId === 'DetailsEditor'">
      <template v-if="nestedShape">
        <div v-for="i in count" :key="i" class="form-preview__nested-form">
          <button
            v-if="multi && canRemove"
            class="form-preview__remove-btn form-preview__nested-remove"
            type="button"
            :title="t('formPreview.removeValue')"
            @click="removeValue"
          >×</button>
          <PreviewField v-for="nf in nestedFields" :key="nf.id" :field="nf" :schema="schema" />
        </div>
      </template>
      <div v-else class="form-preview__nested">
        ▢ {{ field.node ? t('formPreview.nestedSubform', { iri: field.node }) : t('formPreview.nestedSubformGeneric') }}
      </div>
    </template>

    <!-- All other widgets -->
    <template v-else>
      <div v-for="i in count" :key="i" class="form-preview__value-row">
        <div class="form-preview__value-input">
          <FieldInput :field="field" />
        </div>
        <input v-if="isLangTagged" class="form-preview__lang" type="text" placeholder="en" :title="t('formPreview.langTag')" />
        <button
          v-if="multi && canRemove"
          class="form-preview__remove-btn"
          type="button"
          :title="t('formPreview.removeValue')"
          @click="removeValue"
        >×</button>
      </div>
    </template>

    <button
      v-if="multi"
      class="form-preview__add-btn"
      type="button"
      :disabled="!canAdd"
      :title="canAdd ? '' : t('formPreview.maxReached', { max: maxN })"
      @click="addValue"
    >
      {{ t('formPreview.add') }}
    </button>

    <p v-if="field.message" class="form-preview__msg" :class="`sev-${(field.severity || 'sh:Violation').replace('sh:', '').toLowerCase()}`">
      {{ field.message }}
    </p>
  </div>
</template>
