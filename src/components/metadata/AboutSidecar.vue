<script setup lang="ts">
import type { FdpRecord } from "@/data/sampleRecord";
import MetaItem from "./MetaItem.vue";
import RdfPreviewPanel from "./RdfPreviewPanel.vue";
import RelatedList from "./RelatedList.vue";

defineProps<{ record: FdpRecord; container?: string | null }>();
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

      <hr class="hr divider" />
      <RdfPreviewPanel />

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
</style>
