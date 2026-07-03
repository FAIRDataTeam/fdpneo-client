<script setup lang="ts">
/**
 * Steward dashboard — "My metadata".
 *
 * Lists every record the signed-in steward can author (the server has no
 * per-record ownership yet), via `useStewardRecords`. Real per-type counts, a
 * client-side title filter, and per-row view/edit links into the Phase 7 CRUD
 * flows. The sidebar's secondary sections are placeholders for Phase 9
 * (publication state, schemas, users, settings) and are intentionally inert.
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useStewardRecords } from "@/composables/useStewardRecords";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import AppIcon from "@/components/shared/AppIcon.vue";
import StateBadge from "@/components/shared/StateBadge.vue";
import TypeTag from "@/components/shared/TypeTag.vue";
import type { IconName } from "@/types/record";

const { t } = useI18n();
const auth = useAuthStore();
const { rows, recent, isLoading } = useStewardRecords();

const userName = computed(
  () => auth.user?.profile?.name || auth.user?.profile?.email || t("stewardDashboard.userFallback"),
);

const filter = ref("");
const filtered = computed(() => {
  const all = rows.value;
  const q = filter.value.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (r) => r.title.toLowerCase().includes(q) || r.typeLabel.toLowerCase().includes(q),
  );
});

const counts = computed(() => {
  const all = rows.value;
  const by = (label: string) => all.filter((r) => r.typeLabel === label).length;
  return [
    { value: all.length, label: t("stewardDashboard.countRecords") },
    { value: by("Catalog"), label: t("stewardDashboard.countCatalogs") },
    { value: by("Dataset"), label: t("stewardDashboard.countDatasets") },
    { value: by("Distribution"), label: t("stewardDashboard.countDistributions") },
  ];
});

const newCatalogLink = computed(
  () => `/create/catalog?parent=${encodeURIComponent(apiBase())}`,
);

const nav = computed<{ icon: IconName; label: string; active?: boolean }[]>(() => [
  { icon: "book", label: t("stewardDashboard.navMyMetadata"), active: true },
]);
const soon = computed<{ icon: IconName; label: string }[]>(() => [
  { icon: "edit", label: t("stewardDashboard.soonDrafts") },
  { icon: "shield", label: t("stewardDashboard.soonPendingReview") },
  { icon: "filter", label: t("stewardDashboard.soonSchemas") },
  { icon: "user", label: t("stewardDashboard.soonUsers") },
  { icon: "globe", label: t("stewardDashboard.soonSettings") },
]);
</script>

<template>
  <main class="layout">
    <aside class="side">
      <div class="eyebrow">{{ userName }}</div>
      <nav>
        <RouterLink
          v-for="n in nav"
          :key="n.label"
          to="/dashboard"
          :class="['navitem', n.active ? 'active' : '']"
        >
          <AppIcon :name="n.icon" :size="14" />
          <span class="label">{{ n.label }}</span>
        </RouterLink>
      </nav>
      <hr class="hr" />
      <div class="eyebrow">{{ t("stewardDashboard.comingSoon") }}</div>
      <nav>
        <span v-for="n in soon" :key="n.label" class="navitem disabled" aria-disabled="true">
          <AppIcon :name="n.icon" :size="14" />
          <span class="label">{{ n.label }}</span>
        </span>
      </nav>
    </aside>

    <section class="main">
      <div class="title">
        <h1>{{ t("stewardDashboard.heading") }}</h1>
        <div class="title__actions">
          <RouterLink :to="newCatalogLink" class="btn primary">
            <AppIcon name="plus" :size="13" /> {{ t("stewardDashboard.newCatalog") }}
          </RouterLink>
        </div>
      </div>
      <p class="lede">{{ t("stewardDashboard.lede") }}</p>

      <div class="kpi-strip">
        <div v-for="k in counts" :key="k.label" class="kpi">
          <div class="kpi__value">{{ k.value }}</div>
          <div class="kpi__label">{{ k.label }}</div>
        </div>
      </div>

      <div class="toolbar">
        <div class="filter">
          <AppIcon name="search" :size="14" color="var(--fair-text-muted)" />
          <input v-model="filter" type="text" :placeholder="t('stewardDashboard.filterPlaceholder')" :aria-label="t('stewardDashboard.filterAria')" />
        </div>
        <div class="spacer" />
        <span class="small muted">{{ t("stewardDashboard.recordsCount", { n: filtered.length }) }}</span>
      </div>

      <div v-if="isLoading" class="empty">{{ t("stewardDashboard.loading") }}</div>
      <div v-else-if="filtered.length === 0" class="empty">
        {{ filter ? t("stewardDashboard.emptyMatch") : t("stewardDashboard.emptyYet") }}
      </div>
      <div v-else class="table">
        <div class="thead">
          <span>{{ t("stewardDashboard.thRecord") }}</span>
          <span>{{ t("stewardDashboard.thModified") }}</span>
          <span />
        </div>
        <div v-for="row in filtered" :key="row.id" class="trow">
          <div class="cell-record">
            <div class="badges">
              <TypeTag :kind="row.type">{{ row.typeLabel }}</TypeTag>
              <StateBadge :state="row.state" />
            </div>
            <RouterLink :to="`/records/${row.id}`" class="rtitle">{{ row.title }}</RouterLink>
          </div>
          <span class="small muted">{{ row.modified || "—" }}</span>
          <RouterLink :to="`/records/${row.id}/edit`" class="btn ghost sm">
            <AppIcon name="edit" :size="13" /> {{ t("stewardDashboard.edit") }}
          </RouterLink>
        </div>
      </div>

      <template v-if="recent.length">
        <h2 class="recent-title">{{ t("stewardDashboard.recentlyUpdated") }}</h2>
        <ul class="recent">
          <li v-for="row in recent" :key="row.id">
            <RouterLink :to="`/records/${row.id}`" class="rtitle">{{ row.title }}</RouterLink>
            <span class="small muted">{{ row.modified || "—" }}</span>
          </li>
        </ul>
      </template>
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
  background: var(--fair-bg);
}
.side .eyebrow {
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-muted);
  margin-bottom: 12px;
}
.side nav {
  display: grid;
  gap: 2px;
}
.side .hr {
  margin: 20px 0;
  border: 0;
  border-top: 1px solid var(--fair-separator);
}
.navitem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--fair-radius-md);
  color: var(--fair-text);
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}
.navitem.active {
  background: var(--tool-accent-tint);
  color: var(--tool-accent);
}
.navitem.disabled {
  color: var(--fair-text-light);
  cursor: default;
}
.label {
  flex: 1;
}

.title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
}
.title h1 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 32px;
  line-height: 1.1;
  color: var(--fair-text-strong);
}
.title__actions {
  display: flex;
  gap: 8px;
}
.title__actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lede {
  margin: 6px 0 22px;
  color: var(--fair-text-muted);
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.55;
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 20px 24px;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  margin-bottom: 28px;
}
.kpi__value {
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 32px;
  line-height: 1;
  color: var(--fair-text-strong);
  margin-bottom: 6px;
}
.kpi__label {
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-muted);
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
  background: var(--fair-surface);
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  flex: 1;
  max-width: 320px;
}
.filter input {
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--fair-font-sans);
  font-size: 13px;
  color: var(--fair-text-strong);
  width: 100%;
}
.spacer {
  flex: 1;
}
.small {
  font-size: 12px;
}
.muted {
  color: var(--fair-text-muted);
}
.empty {
  padding: 48px;
  text-align: center;
  color: var(--fair-text-muted);
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
}

.table {
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  overflow: hidden;
}
.thead,
.trow {
  display: grid;
  grid-template-columns: 1fr 120px 90px;
  gap: 14px;
  padding: 14px 18px;
  align-items: center;
}
.thead {
  background: var(--fair-highlight);
  border-bottom: 1px solid var(--fair-separator);
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-muted);
}
.trow {
  border-bottom: 1px solid var(--fair-separator);
}
.trow:last-child {
  border-bottom: 0;
}
.cell-record {
  min-width: 0;
}
.badges {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rtitle {
  display: block;
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 14px;
  line-height: 1.3;
  color: var(--fair-text-strong);
  margin-top: 3px;
  text-decoration: none;
}
.rtitle:hover {
  color: var(--tool-accent);
}
.trow .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.recent-title {
  margin: 28px 0 12px;
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-muted);
}
.recent {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  overflow: hidden;
}
.recent li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--fair-separator);
}
.recent li:last-child {
  border-bottom: 0;
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
    grid-template-columns: 1fr 100px 80px;
  }
}
</style>
