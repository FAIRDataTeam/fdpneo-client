<script setup lang="ts">
import { computed } from "vue";
import type { FdpRecord } from "@/data/sampleRecord";
import MetaItem from "./MetaItem.vue";
import RdfPreviewPanel from "./RdfPreviewPanel.vue";
import RelatedList from "./RelatedList.vue";

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
const isUrl = (v: string): boolean => /^https?:\/\//i.test(v);
</script>

<template>
  <aside class="sidecar" aria-label="About this record">
    <div class="card">
      <div class="eyebrow">About this record</div>
      <dl class="meta">
        <MetaItem label="Issued">{{ record.issued }}</MetaItem>
        <MetaItem label="Last modified">{{ record.modified }}</MetaItem>
        <MetaItem label="Container">{{ container || "—" }}</MetaItem>
      </dl>

      <template v-if="hasIdentifiers">
        <hr class="hr divider" />
        <div class="eyebrow">Identifiers</div>
        <dl class="meta">
          <MetaItem v-if="record.identifier" label="Identifier" mono>
            <a v-if="isUrl(record.identifier)" :href="record.identifier" target="_blank" rel="noopener noreferrer">{{ record.identifier }}</a>
            <template v-else>{{ record.identifier }}</template>
          </MetaItem>
          <MetaItem v-if="record.sameAs.length" label="Same as" mono>
            <ul class="idlist">
              <li v-for="iri in record.sameAs" :key="iri">
                <a :href="iri" target="_blank" rel="noopener noreferrer">{{ iri }}</a>
              </li>
            </ul>
          </MetaItem>
          <MetaItem v-if="record.exactMatch.length" label="Exact match" mono>
            <ul class="idlist">
              <li v-for="iri in record.exactMatch" :key="iri">
                <a :href="iri" target="_blank" rel="noopener noreferrer">{{ iri }}</a>
              </li>
            </ul>
          </MetaItem>
        </dl>
      </template>

      <hr class="hr divider" />
      <RdfPreviewPanel :record-id="recordId ?? ''" auto-open />

      <hr class="hr divider" />
      <div class="eyebrow">Related</div>
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
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
  position: sticky;
  top: 80px;
}
.eyebrow {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
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
  color: var(--accent, var(--ink-2));
  text-decoration: none;
  overflow-wrap: anywhere;
}
.idlist a:hover,
.meta a:hover {
  text-decoration: underline;
}
</style>
