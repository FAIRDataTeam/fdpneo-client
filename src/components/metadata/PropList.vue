<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { FdpRecord } from "@/data/sampleRecord";
import PropRow from "./PropRow.vue";
import AppChip from "@/components/shared/AppChip.vue";
import { useLabels } from "@/composables/useLabels";
import { safeHref } from "@/composables/safeUrl";

const { t } = useI18n();

const props = defineProps<{ record: FdpRecord }>();

// Resolve the record's IRI-valued properties to human labels via `/labels`.
// `labels[iri]` is the resolved text; each row falls back to the value the RDF
// mapper already derived (publisher/creator/… short labels) so nothing is blank
// or a raw URL when the label service is unavailable.
const themeUris = computed(() => props.record.themeUris ?? []);
const irisToResolve = computed(() =>
  [
    props.record.publisherUri,
    props.record.creatorUri,
    props.record.licenseUri,
    props.record.languageUri,
    props.record.spatialUri,
    ...themeUris.value,
  ].filter((iri): iri is string => !!iri),
);
const { labels } = useLabels(irisToResolve);

// Resolved label if the service returned one, else the mapper's fallback label.
const textFor = (uri: string | undefined, fallback: string) =>
  (uri && labels.value[uri]) || fallback;

const publisherText = computed(() => textFor(props.record.publisherUri, props.record.publisher));
const creatorText = computed(() => textFor(props.record.creatorUri, props.record.creator ?? ""));
const licenseText = computed(() => textFor(props.record.licenseUri, props.record.license));
const languageText = computed(() => textFor(props.record.languageUri, props.record.language));
const spatialText = computed(() => textFor(props.record.spatialUri, props.record.spatial));

// Record IRIs come from user-controlled RDF metadata; allowlist the scheme
// before binding into `:href` so a `javascript:`/`data:` IRI can't run script.
// When unsafe (or the value is a plain literal, not a URL), fall back to plain
// text (no link) rather than a live href.
const publisherHref = computed(() => safeHref(props.record.publisherUri));
const creatorHref = computed(() => safeHref(props.record.creatorUri));
const licenseHref = computed(() => safeHref(props.record.licenseUri));
const languageHref = computed(() => safeHref(props.record.languageUri));
const spatialHref = computed(() => safeHref(props.record.spatialUri));

// Prefer resolved theme labels keyed by IRI; fall back to the mapper's short
// labels when the record carries no theme IRIs (e.g. fixtures).
const themeChips = computed(() =>
  themeUris.value.length
    ? themeUris.value.map((iri, i) => ({
        key: iri,
        text: labels.value[iri] || props.record.themes[i] || iri,
      }))
    : props.record.themes.map((t) => ({ key: t, text: t })),
);
</script>

<template>
  <dl class="list">
    <PropRow :label="t('propList.publisher')">
      <a
        v-if="publisherHref"
        :href="publisherHref"
        class="accent"
        rel="noopener noreferrer"
        >{{ publisherText }}</a
      >
      <span v-else>{{ publisherText }}</span>
    </PropRow>
    <PropRow v-if="creatorText" :label="t('propList.creator')">
      <a v-if="creatorHref" :href="creatorHref" class="accent" rel="noopener noreferrer">{{
        creatorText
      }}</a>
      <span v-else>{{ creatorText }}</span>
    </PropRow>
    <PropRow :label="t('propList.license')">
      <a v-if="licenseHref" :href="licenseHref" class="accent" rel="noopener noreferrer">{{
        licenseText
      }}</a>
      <span v-else>{{ licenseText }}</span>
    </PropRow>
    <PropRow v-if="languageText" :label="t('propList.language')">
      <a v-if="languageHref" :href="languageHref" class="accent" rel="noopener noreferrer">{{
        languageText
      }}</a>
      <span v-else>{{ languageText }}</span>
    </PropRow>
    <PropRow :label="t('propList.themes')">
      <div class="themes">
        <AppChip v-for="chip in themeChips" :key="chip.key" variant="accent">{{ chip.text }}</AppChip>
      </div>
    </PropRow>
    <PropRow v-if="spatialText" :label="t('propList.spatial')">
      <a v-if="spatialHref" :href="spatialHref" class="accent" rel="noopener noreferrer">{{
        spatialText
      }}</a>
      <span v-else>{{ spatialText }}</span>
    </PropRow>
    <PropRow :label="t('propList.conformsTo')" mono>{{ record.conformsTo }}</PropRow>
    <PropRow :label="t('propList.identifier')" mono>
      <span class="muted">{{ record.identifier }}</span>
    </PropRow>
  </dl>
</template>

<style scoped>
.list {
  margin: 0;
}
.themes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.accent {
  color: var(--tool-accent);
}
</style>
