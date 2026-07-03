<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { FdpRecord } from "@/data/sampleRecord";
import { safeHref } from "@/composables/safeUrl";
import MetaItem from "./MetaItem.vue";
import RdfPreviewPanel from "./RdfPreviewPanel.vue";
import RelatedList from "./RelatedList.vue";

const { t } = useI18n();

const props = defineProps<{ record: FdpRecord; container?: string | null; recordId?: string }>();

// Dual-identifier block (ADR-0014): shown only when the record carries any of
// dct:identifier / owl:sameAs / skos:exactMatch. owl:sameAs may be present even
// though the user didn't enter it (the server records a foreign subject IRI
// there), so this is a display surface, never an error.
const hasIdentifiers = computed(
  () =>
    !!props.record.identifier ||
    props.record.sameAs.length > 0 ||
    props.record.exactMatch.length > 0,
);
</script>

<template>
  <aside class="sidecar" :aria-label="t('aboutSidecar.ariaLabel')">
    <div class="card">
      <div class="eyebrow">{{ t("aboutSidecar.heading") }}</div>
      <dl class="meta">
        <MetaItem :label="t('aboutSidecar.issued')">{{ record.issued }}</MetaItem>
        <MetaItem :label="t('aboutSidecar.lastModified')">{{ record.modified }}</MetaItem>
        <MetaItem :label="t('aboutSidecar.container')">{{ container || "—" }}</MetaItem>
      </dl>

      <template v-if="hasIdentifiers">
        <hr class="hr divider" />
        <div class="eyebrow">{{ t("aboutSidecar.identifiers") }}</div>
        <dl class="meta">
          <MetaItem v-if="record.identifier" :label="t('aboutSidecar.identifier')" mono>
            <a v-if="safeHref(record.identifier)" :href="safeHref(record.identifier)" target="_blank" rel="noopener noreferrer">{{ record.identifier }}</a>
            <template v-else>{{ record.identifier }}</template>
          </MetaItem>
          <MetaItem v-if="record.sameAs.length" :label="t('aboutSidecar.sameAs')" mono>
            <ul class="idlist">
              <li v-for="iri in record.sameAs" :key="iri">
                <a v-if="safeHref(iri)" :href="safeHref(iri)" target="_blank" rel="noopener noreferrer">{{ iri }}</a>
                <template v-else>{{ iri }}</template>
              </li>
            </ul>
          </MetaItem>
          <MetaItem v-if="record.exactMatch.length" :label="t('aboutSidecar.exactMatch')" mono>
            <ul class="idlist">
              <li v-for="iri in record.exactMatch" :key="iri">
                <a v-if="safeHref(iri)" :href="safeHref(iri)" target="_blank" rel="noopener noreferrer">{{ iri }}</a>
                <template v-else>{{ iri }}</template>
              </li>
            </ul>
          </MetaItem>
        </dl>
      </template>

      <hr class="hr divider" />
      <RdfPreviewPanel :record-id="recordId ?? ''" auto-open />

      <hr class="hr divider" />
      <div class="eyebrow">{{ t("aboutSidecar.related") }}</div>
      <RelatedList :items="record.related" />
    </div>
  </aside>
</template>

<style scoped>
.sidecar {
  display: block;
}
.card {
  padding: 20px 18px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
}
.eyebrow {
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-medium);
  font-size: var(--fair-text-xs);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  color: var(--fair-text-muted);
  margin-bottom: 14px;
}
.meta {
  margin: 0;
  display: grid;
  gap: 14px;
}
.divider {
  margin: 18px -18px;
}
.idlist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.idlist a,
.meta a {
  color: var(--tool-accent, var(--fair-text));
  text-decoration: none;
  overflow-wrap: anywhere;
}
.idlist a:hover,
.meta a:hover {
  text-decoration: underline;
}
</style>
