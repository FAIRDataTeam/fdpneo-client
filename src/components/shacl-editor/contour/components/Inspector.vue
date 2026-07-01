<script setup lang="ts">
import { computed } from 'vue';
import { DATATYPES, NODE_KINDS, VOCAB_TERMS, VOCAB_CLASSES, WIDGET_BY_ID, newId } from '../data';
import { useI18n } from '../composables/useI18n';
import type { Field, Group, Mutator, NestedShape, Prefix, Schema, SelectedKind } from '../types';
import Icon from './Icon.vue';
import WidgetIcon from './WidgetIcon.vue';
import InValuesEditor from './InValuesEditor.vue';
import OrTypesEditor from './OrTypesEditor.vue';
import PrefixEditor from './PrefixEditor.vue';
import TranslationsEditor from './TranslationsEditor.vue';

interface Props {
  schema: Schema;
  selectedKind: SelectedKind;
  selectedId: string | null;
  selectedNestedShapeId: string | null;
  mutate: (m: Mutator, coalesceKey?: string) => void;
}
const props = defineProps<Props>();
const emit = defineEmits<{ clear: [] }>();
const { t, plural } = useI18n();

// ── Computed selections ────────────────────────────────────────────────────

interface FieldLocation {
  field: Field;
  group: Group;
}

const currentField = computed<FieldLocation | null>(() => {
  if (props.selectedKind !== 'field' || !props.selectedId) return null;
  for (const g of props.schema.groups) {
    const f = g.fields.find((x) => x.id === props.selectedId);
    if (f) return { field: f, group: g };
  }
  return null;
});

const currentGroup = computed<Group | null>(() => {
  if (props.selectedKind !== 'group' || !props.selectedId) return null;
  return props.schema.groups.find((g) => g.id === props.selectedId) || null;
});

const currentNestedShape = computed<NestedShape | null>(() => {
  if (!props.selectedNestedShapeId) return null;
  return (props.schema.nestedShapes || []).find((x) => x.id === props.selectedNestedShapeId) || null;
});

const currentNestedField = computed<Field | null>(() => {
  if (props.selectedKind !== 'nested-field' || !props.selectedId) return null;
  const ns = currentNestedShape.value;
  if (!ns) return null;
  return ns.fields.find((f) => f.id === props.selectedId) || null;
});

// The field being edited — either a main field or a nested field.
const activeField = computed<Field | null>(() => {
  if (props.selectedKind === 'field') return currentField.value?.field || null;
  if (props.selectedKind === 'nested-field') return currentNestedField.value;
  return null;
});

// ── Derived presentation ───────────────────────────────────────────────────

const subtitle = computed(() => {
  if (props.selectedKind === 'field') return t('inspector.subtitle.field');
  if (props.selectedKind === 'group') return t('inspector.subtitle.group');
  if (props.selectedKind === 'nested-shape') return t('inspector.subtitle.nestedShape');
  if (props.selectedKind === 'nested-field') return t('inspector.subtitle.nestedField');
  return t('inspector.subtitle.schema');
});

const fieldWidget = computed(() =>
  activeField.value ? WIDGET_BY_ID[activeField.value.widgetId] : null,
);

const SEVERITIES = ['sh:Violation', 'sh:Warning', 'sh:Info'];

const isLiteral = computed(() => (activeField.value?.nodeKind || '').includes('Literal'));
const isIRI = computed(() => (activeField.value?.nodeKind || '').includes('IRI'));

// Value-range bounds (sh:minInclusive etc.) only make sense for numeric / date widgets.
const showRange = computed(() => {
  const id = fieldWidget.value?.id;
  return id === 'NumberFieldEditor' || id === 'DatePickerEditor' || id === 'DateTimePickerEditor';
});

const showCloseBtn = computed(() =>
  props.selectedKind === 'field' ||
  props.selectedKind === 'group' ||
  props.selectedKind === 'nested-shape' ||
  props.selectedKind === 'nested-field',
);

// ── Mutations ──────────────────────────────────────────────────────────────

function setField<K extends keyof Field>(key: K, value: Field[K]) {
  if (props.selectedKind === 'field') {
    const loc = currentField.value;
    if (!loc) return;
    props.mutate((draft) => {
      const g = draft.groups.find((x) => x.id === loc.group.id);
      if (!g) return;
      const i = g.fields.findIndex((f) => f.id === loc.field.id);
      if (i >= 0) (g.fields[i] as Field)[key] = value;
    }, `f:${loc.field.id}:${String(key)}`);
  } else if (props.selectedKind === 'nested-field') {
    const nsId = props.selectedNestedShapeId;
    const fId = props.selectedId;
    if (!nsId || !fId) return;
    props.mutate((draft) => {
      const ns = (draft.nestedShapes || []).find((x) => x.id === nsId);
      if (!ns) return;
      const i = ns.fields.findIndex((f) => f.id === fId);
      if (i >= 0) (ns.fields[i] as Field)[key] = value;
    }, `nf:${nsId}:${fId}:${String(key)}`);
  }
}

function setGroup<K extends keyof Group>(key: K, value: Group[K]) {
  const grp = currentGroup.value;
  if (!grp) return;
  props.mutate((draft) => {
    const g = draft.groups.find((x) => x.id === grp.id);
    if (g) (g)[key] = value;
  }, `g:${grp.id}:${String(key)}`);
}

function deleteCurrentGroup() {
  const grp = currentGroup.value;
  if (!grp) return;
  props.mutate((draft) => {
    const i = draft.groups.findIndex((g) => g.id === grp.id);
    if (i >= 0) draft.groups.splice(i, 1);
  });
  emit('clear');
}

function setSchema<K extends keyof Schema>(key: K, value: Schema[K]) {
  props.mutate((draft) => {
    (draft)[key] = value;
  }, `s:${String(key)}`);
}

function setNestedShape<K extends keyof NestedShape>(key: K, value: NestedShape[K]) {
  const ns = currentNestedShape.value;
  if (!ns) return;
  props.mutate((draft) => {
    const x = (draft.nestedShapes || []).find((n) => n.id === ns.id);
    if (x) (x)[key] = value;
  }, `ns:${ns.id}:${String(key)}`);
}

function setNestedShapeIri(newIri: string) {
  const ns = currentNestedShape.value;
  if (!ns) return;
  const oldIri = ns.iri;
  props.mutate((draft) => {
    const x = (draft.nestedShapes || []).find((n) => n.id === ns.id);
    if (x) x.iri = newIri;
    // Propagate IRI rename to all fields that reference it via sh:node
    for (const g of draft.groups) {
      for (const f of g.fields) {
        if (f.node === oldIri) f.node = newIri;
      }
    }
  });
}

function deleteCurrentNestedShape() {
  const ns = currentNestedShape.value;
  if (!ns) return;
  props.mutate((draft) => {
    const i = (draft.nestedShapes || []).findIndex((x) => x.id === ns.id);
    if (i >= 0) draft.nestedShapes.splice(i, 1);
  });
  emit('clear');
}

function onNumber(e: Event): number | null {
  const v = (e.target as HTMLInputElement).value;
  return v === '' ? null : Number(v);
}

// Prefixes referenced anywhere in the schema (so the PrefixEditor can warn
// before removing one that's still in use). sh/dash/rdfs are always emitted.
const usedPrefixes = computed<string[]>(() => {
  const used = new Set<string>(['sh', 'dash', 'rdfs']);
  const add = (term?: string | null) => {
    if (!term || term.startsWith('<')) return;
    const c = term.indexOf(':');
    if (c >= 0) used.add(term.slice(0, c));
  };
  const addField = (f: Field) => {
    add(f.path); add(f.class); add(f.datatype); add(f.node);
    for (const iv of f.inValues || []) if (iv.kind === 'iri') add(iv.value);
    for (const ot of f.orTypes || []) { add(ot.datatype); add(ot.nodeKind); add(ot.class); }
  };
  const s = props.schema;
  if (s.schemaDescription) used.add('dct');
  add(s.shapeIri); add(s.targetClass);
  for (const g of s.groups) { add(g.iri); g.fields.forEach(addField); }
  for (const ns of s.nestedShapes || []) { add(ns.iri); add(ns.targetClass); ns.fields.forEach(addField); }
  return [...used];
});

// Create a fresh nested shape and link the active DetailsEditor field to it via
// sh:node — in one undo step. Works for a main field or a nested field.
function createAndLinkNestedShape() {
  const f = activeField.value;
  if (!f) return;
  const kind = props.selectedKind;
  const fId = props.selectedId;
  const parentNsId = props.selectedNestedShapeId;
  props.mutate((draft) => {
    if (!draft.nestedShapes) draft.nestedShapes = [];
    const base = (f.name || 'Nested').replace(/[^A-Za-z0-9]+/g, '') || 'Nested';
    const exists = (x: string) => draft.nestedShapes.some((ns) => ns.iri === x);
    let iri = `:${base}Shape`;
    let i = 2;
    while (exists(iri)) iri = `:${base}Shape${i++}`;
    draft.nestedShapes.push({ id: newId('ns'), iri, targetClass: f.class || '', fields: [] });
    if (kind === 'field') {
      for (const g of draft.groups) {
        const ff = g.fields.find((x) => x.id === fId);
        if (ff) { ff.node = iri; break; }
      }
    } else if (kind === 'nested-field' && parentNsId) {
      const ns = draft.nestedShapes.find((x) => x.id === parentNsId);
      const ff = ns?.fields.find((x) => x.id === fId);
      if (ff) ff.node = iri;
    }
  });
}
</script>

<template>
  <div class="panel">
    <div class="panel__header">
      <div>
        <div class="panel__title">{{ t('inspector.title') }}</div>
        <div class="panel__subtitle">{{ subtitle }}</div>
      </div>
      <button
        v-if="showCloseBtn"
        class="btn btn-ghost btn-xs"
        :title="t('inspector.backToSchema')"
        @click="emit('clear')"
      >
        <Icon name="x" :size="13" />
      </button>
    </div>
    <datalist id="vocab-terms">
      <option v-for="o in VOCAB_TERMS" :key="o" :value="o" />
    </datalist>
    <datalist id="vocab-classes">
      <option v-for="o in VOCAB_CLASSES" :key="o" :value="o" />
    </datalist>
    <div class="panel__body panel__body--snug">

      <!-- FIELD INSPECTOR (main or nested) -->
      <div v-if="activeField && fieldWidget">
        <div class="field-head">
          <div class="field-head__icon"><WidgetIcon :char="fieldWidget.icon" /></div>
          <div style="flex: 1; min-width: 0">
            <div style="font-weight: 700; color: var(--color-text-dark)">
              {{ t(`widget.${fieldWidget.id}.name`) }}
            </div>
            <div class="field-head__editor">{{ fieldWidget.editor }}</div>
          </div>
        </div>

        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.basic') }}</div>
          <div class="form-row">
            <label class="required">{{ t('inspector.label.name') }}</label>
            <div class="lang-field">
              <input
                type="text"
                :value="activeField.name"
                @input="setField('name', ($event.target as HTMLInputElement).value)"
              />
              <input
                type="text"
                class="lang-field__tag"
                :value="activeField.nameLang ?? ''"
                :placeholder="t('inspector.langPlaceholder')"
                :title="t('inspector.langTitle')"
                @input="setField('nameLang', ($event.target as HTMLInputElement).value || undefined)"
              />
            </div>
          </div>
          <TranslationsEditor
            v-if="(activeField.nameI18n && activeField.nameI18n.length) || activeField.nameLang"
            :values="activeField.nameI18n"
            :label="t('inspector.label.nameTranslations')"
            @change="(v) => setField('nameI18n', v)"
          />
          <div class="form-row">
            <label>{{ t('inspector.label.description') }}</label>
            <div class="lang-field">
              <textarea
                :value="activeField.description"
                :placeholder="t('inspector.placeholder.descriptionHelp')"
                @input="setField('description', ($event.target as HTMLTextAreaElement).value)"
              />
              <input
                type="text"
                class="lang-field__tag"
                :value="activeField.descriptionLang ?? ''"
                :placeholder="t('inspector.langPlaceholder')"
                :title="t('inspector.langTitle')"
                @input="setField('descriptionLang', ($event.target as HTMLInputElement).value || undefined)"
              />
            </div>
          </div>
          <TranslationsEditor
            v-if="(activeField.descriptionI18n && activeField.descriptionI18n.length) || activeField.descriptionLang"
            :values="activeField.descriptionI18n"
            :label="t('inspector.label.descriptionTranslations')"
            @change="(v) => setField('descriptionI18n', v)"
          />
          <div class="form-row">
            <label class="required">{{ t('inspector.label.path') }}</label>
            <input
              type="text"
              class="mono"
              list="vocab-terms"
              :value="activeField.path"
              placeholder="dct:title"
              @input="setField('path', ($event.target as HTMLInputElement).value)"
            />
            <label class="insp-check">
              <input
                type="checkbox"
                :checked="!!activeField.inversePath"
                @change="setField('inversePath', ($event.target as HTMLInputElement).checked || undefined)"
              />
              {{ t('inspector.inversePath') }}
            </label>
          </div>
        </div>

        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.constraints') }}</div>
          <div class="form-row-2">
            <div class="form-row">
              <label>{{ t('inspector.label.minCount') }}</label>
              <input
                type="number"
                :value="activeField.minCount ?? ''"
                placeholder="0"
                min="0"
                @input="setField('minCount', onNumber($event))"
              />
            </div>
            <div class="form-row">
              <label>{{ t('inspector.label.maxCount') }}</label>
              <input
                type="number"
                :value="activeField.maxCount ?? ''"
                placeholder="∞"
                min="1"
                @input="setField('maxCount', onNumber($event))"
              />
            </div>
          </div>
          <div class="form-row">
            <label>{{ t('inspector.label.nodeKind') }}</label>
            <select
              :value="activeField.nodeKind || ''"
              @change="setField('nodeKind', (($event.target as HTMLSelectElement).value || null) as Field['nodeKind'])"
            >
              <option value="">{{ t('inspector.none') }}</option>
              <option v-for="o in NODE_KINDS" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div v-if="isLiteral" class="form-row">
            <label>{{ t('inspector.label.datatype') }}</label>
            <select
              :value="activeField.datatype || ''"
              @change="setField('datatype', (($event.target as HTMLSelectElement).value || null))"
            >
              <option value="">{{ t('inspector.none') }}</option>
              <option v-for="o in DATATYPES" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div v-if="isIRI" class="form-row">
            <label>{{ t('inspector.label.class') }}</label>
            <input
              type="text"
              class="mono"
              list="vocab-classes"
              :value="activeField.class || ''"
              placeholder="foaf:Agent"
              @input="setField('class', ($event.target as HTMLInputElement).value || null)"
            />
          </div>
          <div v-if="fieldWidget?.id === 'DetailsEditor'" class="form-row">
            <label>{{ t('inspector.label.nestedShape') }}</label>
            <input
              type="text"
              class="mono"
              list="nested-shape-iris"
              :value="activeField.node || ''"
              placeholder=":NestedShape1"
              @input="setField('node', ($event.target as HTMLInputElement).value || null)"
            />
            <datalist id="nested-shape-iris">
              <option v-for="ns in (schema.nestedShapes || [])" :key="ns.id" :value="ns.iri">
                {{ ns.targetClass ? ns.targetClass : '' }}
              </option>
            </datalist>
            <button class="btn btn-secondary btn-xs" style="margin-top: 6px" @click="createAndLinkNestedShape">
              <Icon name="plus" :size="11" /> {{ t('inspector.createLinkNested') }}
            </button>
            <div class="hint">{{ t('inspector.hint.nestedShape') }}</div>
          </div>
          <template v-if="isLiteral">
            <div class="form-row-2">
              <div class="form-row">
                <label>{{ t('inspector.label.minLength') }}</label>
                <input
                  type="number"
                  :value="activeField.minLength ?? ''"
                  placeholder="0"
                  min="0"
                  @input="setField('minLength', onNumber($event))"
                />
              </div>
              <div class="form-row">
                <label>{{ t('inspector.label.maxLength') }}</label>
                <input
                  type="number"
                  :value="activeField.maxLength ?? ''"
                  placeholder="∞"
                  min="1"
                  @input="setField('maxLength', onNumber($event))"
                />
              </div>
            </div>
            <div class="form-row">
              <label>{{ t('inspector.label.pattern') }}</label>
              <input
                type="text"
                class="mono"
                :value="activeField.pattern"
                placeholder="^[A-Z].*"
                @input="setField('pattern', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </template>
          <template v-if="showRange">
            <div class="insp-section__title" style="margin-top: 10px">{{ t('inspector.section.valueRange') }}</div>
            <div class="form-row-2">
              <div class="form-row">
                <label>{{ t('inspector.label.minInclusive') }}</label>
                <input
                  type="text"
                  class="mono"
                  :value="activeField.minInclusive ?? ''"
                  placeholder="≥"
                  @input="setField('minInclusive', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="form-row">
                <label>{{ t('inspector.label.maxInclusive') }}</label>
                <input
                  type="text"
                  class="mono"
                  :value="activeField.maxInclusive ?? ''"
                  placeholder="≤"
                  @input="setField('maxInclusive', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-row">
                <label>{{ t('inspector.label.minExclusive') }}</label>
                <input
                  type="text"
                  class="mono"
                  :value="activeField.minExclusive ?? ''"
                  placeholder="&gt;"
                  @input="setField('minExclusive', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="form-row">
                <label>{{ t('inspector.label.maxExclusive') }}</label>
                <input
                  type="text"
                  class="mono"
                  :value="activeField.maxExclusive ?? ''"
                  placeholder="&lt;"
                  @input="setField('maxExclusive', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <div class="hint">{{ t('inspector.hint.valueRange') }}</div>
          </template>
          <InValuesEditor
            v-if="
              activeField.widgetId === 'EnumSelectEditor' ||
              (activeField.inValues && activeField.inValues.length > 0)
            "
            :values="activeField.inValues"
            @change="(v) => setField('inValues', v)"
          />
          <OrTypesEditor
            v-if="activeField.orTypes && activeField.orTypes.length"
            :values="activeField.orTypes"
            @change="(v) => setField('orTypes', v)"
          />
          <button
            v-else
            class="btn btn-ghost btn-xs"
            style="margin-top: 4px"
            @click="setField('orTypes', [{ nodeKind: 'sh:Literal' }, { nodeKind: 'sh:IRI' }])"
          >
            <Icon name="plus" :size="11" /> {{ t('inspector.addOrTypes') }}
          </button>
        </div>

        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.validation') }}</div>
          <div class="form-row">
            <label>{{ t('inspector.label.message') }}</label>
            <input
              type="text"
              :value="activeField.message ?? ''"
              :placeholder="t('inspector.placeholder.message')"
              @input="setField('message', ($event.target as HTMLInputElement).value || undefined)"
            />
          </div>
          <div class="form-row">
            <label>{{ t('inspector.label.severity') }}</label>
            <select
              :value="activeField.severity || ''"
              @change="setField('severity', (($event.target as HTMLSelectElement).value || undefined))"
            >
              <option value="">{{ t('inspector.severityDefault') }}</option>
              <option v-for="s in SEVERITIES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>

        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.defaultsOrder') }}</div>
          <div class="form-row">
            <label>{{ t('inspector.label.defaultValue') }}</label>
            <input
              type="text"
              :value="activeField.defaultValue"
              placeholder="—"
              @input="setField('defaultValue', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>{{ t('inspector.label.order') }}</label>
            <input
              type="number"
              :value="activeField.order"
              min="0"
              @input="setField('order', Number(($event.target as HTMLInputElement).value))"
            />
          </div>
          <div v-if="selectedKind === 'field'" class="form-row">
            <label>{{ t('inspector.label.group') }}</label>
            <input type="text" disabled :value="currentField?.group.label ?? ''" />
            <div class="hint">{{ t('inspector.hint.moveFieldGroup') }}</div>
          </div>
          <div v-if="selectedKind === 'nested-field'" class="form-row">
            <label>{{ t('inspector.label.nestedShapeRef') }}</label>
            <input type="text" disabled :value="currentNestedShape?.iri ?? ''" />
            <div class="hint">{{ t('inspector.hint.moveFieldNested') }}</div>
          </div>
        </div>
      </div>

      <!-- NESTED SHAPE INSPECTOR -->
      <div v-else-if="selectedKind === 'nested-shape' && currentNestedShape">
        <div class="field-head">
          <div class="field-head__icon"><Icon name="document" :size="18" /></div>
          <div style="flex: 1; min-width: 0">
            <div style="font-weight: 700; color: var(--color-text-dark)">{{ t('inspector.headingNestedShape') }}</div>
            <div class="field-head__editor">sh:NodeShape</div>
          </div>
        </div>
        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.properties') }}</div>
          <div class="form-row">
            <label class="required">{{ t('inspector.label.shapeIri') }}</label>
            <input
              type="text"
              class="mono"
              :value="currentNestedShape.iri"
              placeholder=":NestedShape1"
              @input="setNestedShapeIri(($event.target as HTMLInputElement).value)"
            />
            <div class="hint">{{ t('inspector.hint.shapeIriRename') }}</div>
          </div>
          <div class="form-row">
            <label>{{ t('inspector.label.targetClass') }}</label>
            <input
              type="text"
              class="mono"
              list="vocab-classes"
              :value="currentNestedShape.targetClass"
              placeholder="foaf:Agent"
              @input="setNestedShape('targetClass', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>{{ t('inspector.label.fields') }}</label>
            <input
              type="text"
              disabled
              :value="plural('count.fields', currentNestedShape.fields.length)"
            />
            <div class="hint">{{ t('inspector.hint.addFieldsDrag') }}</div>
          </div>
        </div>
        <div class="insp-section">
          <button class="btn btn-danger-ghost btn-sm" @click="deleteCurrentNestedShape">
            <Icon name="trash" :size="13" /> {{ t('inspector.deleteNestedShape') }}
          </button>
        </div>
      </div>

      <!-- GROUP INSPECTOR -->
      <div v-else-if="currentGroup">
        <div class="field-head">
          <div class="field-head__icon"><Icon name="layers" :size="18" /></div>
          <div style="flex: 1">
            <div style="font-weight: 700; color: var(--color-text-dark)">{{ t('inspector.headingGroup') }}</div>
            <div class="field-head__editor">sh:PropertyGroup</div>
          </div>
        </div>
        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.properties') }}</div>
          <div class="form-row">
            <label class="required">{{ t('inspector.label.groupLabel') }}</label>
            <input
              type="text"
              :value="currentGroup.label"
              @input="setGroup('label', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>{{ t('inspector.label.groupOrder') }}</label>
            <input
              type="number"
              :value="currentGroup.order"
              min="0"
              @input="setGroup('order', Number(($event.target as HTMLInputElement).value))"
            />
          </div>
          <button class="btn btn-danger-ghost btn-sm" @click="deleteCurrentGroup">
            <Icon name="trash" :size="13" /> {{ t('inspector.deleteGroup') }}
          </button>
        </div>
      </div>

      <!-- SCHEMA INSPECTOR -->
      <div v-else>
        <div class="field-head">
          <div class="field-head__icon"><Icon name="layers" :size="18" /></div>
          <div>
            <div style="font-weight: 700; color: var(--color-text-dark)">
              {{ t('inspector.headingSchema') }}
            </div>
            <div class="field-head__editor">sh:NodeShape</div>
          </div>
        </div>
        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.identity') }}</div>
          <div class="form-row">
            <label class="required">{{ t('inspector.label.schemaName') }}</label>
            <input
              type="text"
              :value="schema.schemaName"
              @input="setSchema('schemaName', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>{{ t('inspector.label.description') }}</label>
            <textarea
              :value="schema.schemaDescription"
              @input="setSchema('schemaDescription', ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </div>
        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.shapeDefinition') }}</div>
          <div class="form-row">
            <label>{{ t('inspector.label.shapeIri') }}</label>
            <input
              type="text"
              class="mono"
              :value="schema.shapeIri"
              placeholder=":DatasetShape"
              @input="setSchema('shapeIri', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label class="required">{{ t('inspector.label.targetClass') }}</label>
            <input
              type="text"
              class="mono"
              list="vocab-classes"
              :value="schema.targetClass"
              placeholder="dcat:Dataset"
              @input="setSchema('targetClass', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
        <div class="insp-section">
          <div class="insp-section__title">{{ t('inspector.section.vocabularies') }}</div>
          <PrefixEditor
            :prefixes="schema.prefixes"
            :used="usedPrefixes"
            @change="(v: Prefix[]) => setSchema('prefixes', v)"
          />
        </div>
      </div>

    </div>
  </div>
</template>
