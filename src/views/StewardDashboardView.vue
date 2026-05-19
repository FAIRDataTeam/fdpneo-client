<script setup lang="ts">
/**
 * Steward dashboard — "My metadata".
 *
 * Sidebar nav · KPI strip · owned-records table. Reuses TypeTag/Chip/AppIcon
 * primitives. Filters are visual stubs until the API lands.
 */
import { useStewardRecords } from "@/composables/useStewardRecords";
import { useAuthStore } from "@/stores/auth";
import { computed } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import TypeTag from "@/components/shared/TypeTag.vue";
import AppChip from "@/components/shared/AppChip.vue";
import type { IconName } from "@/types/record";

const auth = useAuthStore();
const { data: rows } = useStewardRecords();

const userName = computed(
  () => auth.user?.profile?.name || auth.user?.profile?.email || "Steward",
);

const nav: { icon: IconName; label: string; count?: number; active?: boolean }[] = [
  { icon: "book", label: "My metadata", count: 18, active: true },
  { icon: "edit", label: "Drafts", count: 3 },
  { icon: "shield", label: "Pending review", count: 1 },
  { icon: "calendar", label: "Recently visited" },
  { icon: "link", label: "Schemas I follow", count: 6 },
];
const admin: { icon: IconName; label: string }[] = [
  { icon: "user", label: "Users" },
  { icon: "tree", label: "Resource definitions" },
  { icon: "filter", label: "Metadata schemas" },
  { icon: "globe", label: "Settings" },
];

const kpis = [
  { value: "18", label: "Records owned", delta: "+2 this month", deltaUp: false, warn: false },
  { value: "1.2k", label: "Views (30d)", delta: "+18%", deltaUp: true, warn: false },
  { value: "148", label: "Downloads (30d)", delta: "+6%", deltaUp: true, warn: false },
  { value: "2", label: "Validation issues", delta: "needs attention", deltaUp: false, warn: true },
];
</script>

<template>
  <main class="layout">
    <aside class="side">
      <div class="eyebrow">{{ userName }}</div>
      <nav>
        <a v-for="n in nav" :key="n.label" :class="['navitem', n.active ? 'active' : '']">
          <AppIcon :name="n.icon" :size="14" />
          <span class="label">{{ n.label }}</span>
          <span v-if="n.count != null" class="count mono">{{ n.count }}</span>
        </a>
      </nav>
      <hr class="hr" />
      <div class="eyebrow">Admin</div>
      <nav>
        <a v-for="n in admin" :key="n.label" class="navitem">
          <AppIcon :name="n.icon" :size="14" />
          <span class="label">{{ n.label }}</span>
        </a>
      </nav>
    </aside>

    <section class="main">
      <div class="title">
        <h1>My metadata</h1>
        <div class="title__actions">
          <button class="btn ghost"><AppIcon name="download" :size="13" /> Export Turtle</button>
          <button class="btn primary"><AppIcon name="plus" :size="13" /> New record</button>
        </div>
      </div>
      <p class="lede">
        18 records you own across 3 catalogs. <a class="accent">Transfer ownership</a> or
        <a class="accent">request review</a>.
      </p>

      <div class="kpi-strip">
        <div v-for="k in kpis" :key="k.label" class="kpi">
          <div class="kpi__value">{{ k.value }}</div>
          <div class="kpi__label">{{ k.label }}</div>
          <div :class="['kpi__delta', k.warn ? 'warn' : k.deltaUp ? 'up' : '']">
            <template v-if="k.deltaUp">▲ </template>
            <template v-else-if="k.warn">▲ </template>
            {{ k.delta }}
          </div>
        </div>
      </div>

      <div class="toolbar">
        <div class="filter">
          <AppIcon name="search" :size="14" color="var(--muted)" />
          <span>Filter records…</span>
        </div>
        <AppChip variant="outline">type · all</AppChip>
        <AppChip variant="outline">status · all</AppChip>
        <AppChip variant="outline">catalog · all</AppChip>
        <div class="spacer" />
        <span class="small muted">{{ rows?.length ?? 0 }} records</span>
      </div>

      <div class="table">
        <div class="thead">
          <span>Record</span>
          <span>Status</span>
          <span>Version</span>
          <span>Views 30d</span>
          <span>Modified</span>
          <span />
        </div>
        <div v-for="row in rows" :key="row.title" class="trow">
          <div class="cell-record">
            <TypeTag :kind="row.type">{{ row.typeLabel }}</TypeTag>
            <div class="rtitle">{{ row.title }}</div>
          </div>
          <span>
            <AppChip v-if="row.status === 'published'" variant="ok" dot>Published</AppChip>
            <AppChip v-else-if="row.status === 'draft'" dot>Draft</AppChip>
            <AppChip v-else style="background: var(--warn-soft); color: var(--warn); border: 0">
              <AppIcon name="shield" :size="11" /> Review
            </AppChip>
          </span>
          <span class="mono small muted">{{ row.version }}</span>
          <span class="mono small">{{ row.views }}</span>
          <span class="small muted">{{ row.modified }}</span>
          <button class="btn ghost sm" aria-label="Row actions">
            <AppIcon name="dots" :size="14" />
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.layout {
  flex: 1;
  padding: 32px 80px 30px;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 40px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  background: var(--paper);
}
.side .eyebrow {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 12px;
}
.side nav {
  display: grid;
  gap: 2px;
}
.side .hr {
  margin: 20px 0;
}
.navitem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--r-2);
  color: var(--ink-2);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}
.navitem.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.label {
  flex: 1;
}
.count {
  font-size: 11px;
  color: var(--muted);
}
.navitem.active .count {
  color: var(--accent);
}

.title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
}
.title h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 32px;
  line-height: 1.1;
  color: var(--ink);
}
.title__actions {
  display: flex;
  gap: 8px;
}
.lede {
  margin: 6px 0 22px;
  color: var(--muted);
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.55;
}
.accent {
  color: var(--accent);
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 20px 24px;
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
  margin-bottom: 28px;
}
.kpi__value {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 32px;
  line-height: 1;
  color: var(--ink);
  margin-bottom: 6px;
}
.kpi__label {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 6px;
}
.kpi__delta {
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 11px;
  line-height: 1;
  color: var(--muted);
}
.kpi__delta.up {
  color: var(--ok);
}
.kpi__delta.warn {
  color: var(--warn);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 34px;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  flex: 1;
  max-width: 320px;
  font-size: 13px;
  color: var(--muted);
}
.spacer {
  flex: 1;
}
.small {
  font-size: 12px;
}
.muted {
  color: var(--muted);
}

.table {
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
  overflow: hidden;
}
.thead,
.trow {
  display: grid;
  grid-template-columns: 1fr 130px 100px 110px 110px 40px;
  gap: 14px;
  padding: 14px 18px;
  align-items: center;
}
.thead {
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.trow {
  border-bottom: 1px solid var(--line);
}
.trow:last-child {
  border-bottom: 0;
}
.cell-record {
  min-width: 0;
}
.rtitle {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  line-height: 1.3;
  color: var(--ink);
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
    padding: 24px 32px;
  }
  .kpi-strip {
    grid-template-columns: repeat(2, 1fr);
  }
  .thead,
  .trow {
    grid-template-columns: 1fr;
  }
}
</style>
