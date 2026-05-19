<script setup lang="ts">
/**
 * Steward edit-in-place — same Focus layout, mutable.
 *
 * Form state lives in local refs (CLAUDE.md: form drafts are component state).
 * Save handlers will route through a `useMutation` shell once the API lands.
 */
import { computed, ref, toRef, watch } from "vue";
import { useRoute } from "vue-router";
import { useRecord } from "@/composables/useRecord";
import SectionTitle from "@/components/shared/SectionTitle.vue";
import StewardSubnav from "@/components/metadata/StewardSubnav.vue";
import EditableTitle from "@/components/metadata/EditableTitle.vue";
import EditableParagraph from "@/components/metadata/EditableParagraph.vue";
import StatStrip from "@/components/metadata/StatStrip.vue";
import DistributionList from "@/components/metadata/DistributionList.vue";
import PropList from "@/components/metadata/PropList.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import AppChip from "@/components/shared/AppChip.vue";

const route = useRoute();
const id = computed(() => {
  const raw = route.params.id;
  return Array.isArray(raw) ? raw.join("/") : (raw as string);
});

const { data: record } = useRecord(toRef(id));

const titleDraft = ref("");
const descriptionDraft = ref("");

watch(
  record,
  (r) => {
    if (!r) return;
    titleDraft.value = r.title;
    descriptionDraft.value = r.description;
  },
  { immediate: true },
);

const breadcrumbs = ["Cohort studies", "Alzheimer's Disease", "AD Cohort 2024 — MRI"];

const validation = [
  { label: "DatasetShape", status: "ok" as const, detail: "22 / 22 properties" },
  { label: "FDP profile", status: "ok" as const, detail: "No violations" },
  { label: "Suggested", status: "warn" as const, detail: "2 optional properties not set" },
];
const versions = [
  { v: "2024.2", date: "Apr 12 2026", current: true },
  { v: "2024.1", date: "Sep 04 2025", current: false },
  { v: "2023.4", date: "Jan 18 2025", current: false },
];
</script>

<template>
  <template v-if="record">
    <StewardSubnav :breadcrumbs="breadcrumbs" :version="record.version" />
    <main class="layout">
      <div class="column">
        <div class="head">
          <span class="chip outline mono">{{ record.identifier.replace("https://", "") }}</span>
          <div class="spacer" />
          <button class="btn ghost sm"><AppIcon name="edit" :size="12" /> Edit identifier</button>
        </div>
        <EditableTitle v-model="titleDraft" />
        <EditableParagraph v-model="descriptionDraft" />

        <SectionTitle>Properties</SectionTitle>
        <PropList :record="record" />

        <SectionTitle>Distributions · {{ record.distributions.length }}</SectionTitle>
        <StatStrip :record="record" />
        <DistributionList :distributions="record.distributions" />
      </div>

      <aside class="sidecar">
        <section class="panel">
          <div class="panel__head">
            <span class="dot" />
            <span class="strong">All changes saved</span>
          </div>
          <div class="mono small muted">Last saved 2 min ago by you</div>
          <div class="actions">
            <button class="btn accent" style="width: 100%; justify-content: center; height: 36px;">
              Publish new version
            </button>
            <button class="btn" style="width: 100%; justify-content: center;">Save as draft</button>
          </div>
        </section>

        <section class="panel">
          <div class="panel__row">
            <span class="strong">Validation</span>
            <AppChip variant="ok"><AppIcon name="check" :size="11" /> Valid</AppChip>
          </div>
          <div class="validation">
            <div v-for="v in validation" :key="v.label" class="vrow">
              <span :class="['badge', v.status]">
                <AppIcon :name="v.status === 'ok' ? 'check' : 'shield'" :size="10" />
              </span>
              <div>
                <div class="strong small">{{ v.label }}</div>
                <div class="mono tiny muted">{{ v.detail }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel__row">
            <span class="strong">Versions</span>
            <button class="btn ghost sm">View all</button>
          </div>
          <div class="versions">
            <div v-for="ver in versions" :key="ver.v" class="version">
              <span :class="['vtag', 'mono', ver.current ? 'current' : '']">{{ ver.v }}</span>
              <span class="small">{{ ver.date }}</span>
              <span v-if="ver.current" class="eyebrow">current</span>
              <div class="spacer" />
              <button v-if="!ver.current" class="btn ghost sm">View</button>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel__row">
            <span class="strong">Access policy</span>
            <button class="btn ghost sm" aria-label="Edit policy">
              <AppIcon name="edit" :size="12" />
            </button>
          </div>
          <p class="muted small">{{ record.access.summary }}</p>
          <div class="mono tiny muted">1 permission · 1 prohibition · deny wins</div>
        </section>
      </aside>
    </main>
  </template>
</template>

<style scoped>
.layout {
  flex: 1;
  padding: 32px 80px 30px;
  display: grid;
  grid-template-columns: minmax(0, 720px) 340px;
  gap: 50px;
  justify-content: center;
  background: var(--paper);
}
.column {
  min-width: 0;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.spacer {
  flex: 1;
}

.sidecar {
  display: grid;
  gap: 16px;
  align-content: start;
}
.panel {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
}
.panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--ok);
}
.strong {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  color: var(--ink);
}
.small {
  font-size: 12px;
  line-height: 1.4;
  color: var(--ink-2);
}
.tiny {
  font-size: 11px;
  line-height: 1.4;
}
.muted {
  color: var(--muted);
}
.actions {
  margin-top: 12px;
  display: grid;
  gap: 6px;
}
.validation,
.versions {
  display: grid;
  gap: 10px;
}
.vrow {
  display: flex;
  align-items: center;
  gap: 10px;
}
.badge {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  display: grid;
  place-items: center;
}
.badge.ok {
  background: var(--ok-soft);
  color: var(--ok);
}
.badge.warn {
  background: var(--warn-soft);
  color: var(--warn);
}
.version {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.vtag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--muted);
  border: 1px solid var(--line);
}
.vtag.current {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent-line);
}
.eyebrow {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

@media (max-width: 1200px) {
  .layout {
    padding: 24px 32px;
    grid-template-columns: 1fr;
  }
}
</style>
