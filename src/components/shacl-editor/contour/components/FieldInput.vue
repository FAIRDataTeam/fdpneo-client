<script setup lang="ts">
import { computed } from 'vue';
import type { Field } from '../types';
import { useI18n } from '../composables/useI18n';

const props = defineProps<{ field: Field }>();
const { t } = useI18n();

// Reflect SHACL constraints onto the preview inputs so the rendered form
// behaves like the real one (required, length, pattern, range).
const required = computed(() => (props.field.minCount || 0) > 0);
const maxlength = computed(() => props.field.maxLength ?? undefined);
const minlength = computed(() => props.field.minLength ?? undefined);
const pattern = computed(() => props.field.pattern || undefined);
const numStep = computed(() => (props.field.datatype === 'xsd:integer' ? '1' : undefined));

// Reference widgets (AutoComplete / Instances select) look up *instances* — that
// index is supplied by the host platform (e.g. the FAIR Data Point) at
// data-entry time, scoped to the field's sh:class. Contour has no such source,
// so the preview just signals what would be searched.
const refPlaceholder = computed(() => {
  if (props.field.widgetId === 'URIEditor') return 'http://…';
  return props.field.class
    ? t('fieldInput.searchClass', { class: props.field.class })
    : t('fieldInput.search');
});
</script>

<template>
  <template v-if="field.widgetId === 'TextAreaEditor' || field.widgetId === 'RichTextEditor'">
    <textarea :placeholder="field.defaultValue || ''" :required="required" :maxlength="maxlength" />
  </template>
  <template v-else-if="field.widgetId === 'BooleanSelectEditor'">
    <select :required="required">
      <option value="">{{ t('fieldInput.select') }}</option>
      <option>true</option>
      <option>false</option>
    </select>
  </template>
  <template v-else-if="field.widgetId === 'EnumSelectEditor'">
    <select :required="required">
      <option value="">{{ t('fieldInput.select') }}</option>
      <option v-for="(v, i) in field.inValues || []" :key="i">{{ v.value }}</option>
    </select>
  </template>
  <template v-else-if="field.widgetId === 'DatePickerEditor'">
    <input type="date" :required="required" :min="field.minInclusive || undefined" :max="field.maxInclusive || undefined" />
  </template>
  <template v-else-if="field.widgetId === 'DateTimePickerEditor'">
    <div class="form-preview__datetime">
      <input type="date" :required="required" :min="field.minInclusive || undefined" :max="field.maxInclusive || undefined" />
      <input type="time" />
    </div>
  </template>
  <template v-else-if="field.widgetId === 'NumberFieldEditor'">
    <input
      type="number"
      :required="required"
      :step="numStep"
      :min="field.minInclusive || undefined"
      :max="field.maxInclusive || undefined"
    />
  </template>
  <template
    v-else-if="
      field.widgetId === 'URIEditor' ||
      field.widgetId === 'AutoCompleteEditor' ||
      field.widgetId === 'InstancesSelectEditor'
    "
  >
    <input
      type="text"
      class="mono"
      :required="required"
      :placeholder="refPlaceholder"
    />
  </template>
  <template v-else>
    <input
      type="text"
      :placeholder="field.defaultValue || ''"
      :required="required"
      :maxlength="maxlength"
      :minlength="minlength"
      :pattern="pattern"
    />
  </template>
</template>
