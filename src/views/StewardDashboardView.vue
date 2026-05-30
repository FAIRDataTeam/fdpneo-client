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
import { useStewardRecords } from "@/composables/useStewardRecords";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import AppIcon from "@/components/shared/AppIcon.vue";
import TypeTag from "@/components/shared/TypeTag.vue";
import type { IconName } from "@/types/record";

const auth = useAuthStore();
const { data: rows, isLoading } = useStewardRecords();

const userName = computed(
  () => auth.user?.profile?.name || auth.user?.profile?.email || "Steward",
);

const filter = ref("");
const filtered = computed(() => {
  const all = rows.value ?? [];
  const q = filter.value.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (r) => r.title.toLowerCase().includes(q) || r.typeLabel.toLowerCase().includes(q),
  );
});

const counts = computed(() => {
  const all = rows.value ?? [];
  const by = (label: string) => all.filter((r) => r.typeLabel === label).length;
  return [
    { value: all.length, label: "Records" },
    { value: by("Catalog"), label: "Catalogs" },
    { value: by("Dataset"), label: "Datasets" },
    { value: by("Distribution"), label: "Distributions" },
  ];
});

const newCatalogLink = computed(
  () => `/create/catalog?parent=${encodeURIComponent(apiBase())}`,
);

const nav: { icon: IconName; label: string; active?: boolean }[] = [
  { icon: "book", label: "My metadata", active: true },
];
const soon: { icon: IconName; label: string }[] = [
  { icon: "edit", label: "Drafts" },
  { icon: "shield", label: "Pending review" },
  { icon: "filter", label: "Metadata schemas" },
  { icon: "user", label: "Users" },
  { icon: "globe", label: "Settings" },
];
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
      <div class="eyebrow">Coming soon</div>
      <nav>
        <span v-for="n in soon" :key="n.label" class="navitem disabled" aria-disabled="true">
          <AppIcon :name="n.icon" :size="14" />
          <span class="label">{{ n.label }}</span>
        </span>
      </nav>
    </aside>

    <section class="main">
      <div class="title">
        <h1>My metadata</h1>
        <div class="title__actions">
          <RouterLink :to="newCatalogLink" class="btn primary">
            <AppIcon name="plus" :size="13" /> New catalog
          </RouterLink>
        </div>
      </div>
      <p class="lede">Every record you can edit on this FAIR Data Point.</p>

      <div class="kpi-strip">
        <div v-for="k in counts" :key="k.label" class="kpi">
          <div class="kpi__value">{{ k.value }}</div>
          <div class="kpi__label">{{ k.label }}</div>
        </div>
      </div>

      <div class="toolbar">
        <div class="filter">
          <AppIcon name="search" :size="14" color="var(--muted)" />
          <input v-model="filter" type="text" placeholder="Filter records…" aria-label="Filter records" />
        </div>
        <div class="spacer" />
        <span class="small muted">{{ filtered.length }} records</span>
      </div>

      <div v-if="isLoading" class="empty">Loading…</div>
      <div v-else-if="filtered.length === 0" class="empty">
        No records {{ filter ? "match your filter" : "yet" }}.
      </div>
      <div v-else class="table">
        <div class="thead">
          <span>Record</span>
          <span>Modified</span>
          <span />
        </div>
        <div v-for="row in filtered" :key="row.id" class="trow">
          <div class="cell-record">
            <TypeTag :kind="row.type">{{ row.typeLabel }}</TypeTag>
            <RouterLink :to="`/records/${row.id}`" class="rtitle">{{ row.title }}</RouterLink>
          </div>
          <span class="small muted">{{ row.modified || "—" }}</span>
          <RouterLink :to="`/records/${row.id}/edit`" class="btn ghost sm">
            <AppIcon name="edit" :size="13" /> Edit
          </RouterLink>
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
  border: 0;
  border-top: 1px solid var(--line);
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
.navitem.disabled {
  color: var(--muted-2);
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
.title__actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lede {
  margin: 6px 0 22px;
  color: var(--muted);
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.55;
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
}
.filter input {
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--ink);
  width: 100%;
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
.empty {
  padding: 48px;
  text-align: center;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
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
  grid-template-columns: 1fr 120px 90px;
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
  display: block;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  line-height: 1.3;
  color: var(--ink);
  margin-top: 3px;
  text-decoration: none;
}
.rtitle:hover {
  color: var(--accent);
}
.trow .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
