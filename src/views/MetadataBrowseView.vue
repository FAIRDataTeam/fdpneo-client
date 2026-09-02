<script setup lang="ts">
/**
 * Repository landing — the FDP root (browse direction 2a).
 *
 * Three panes: a persistent container tree (left) · the repository's own
 * metadata + its catalogs as type-spined cards (center) · the reusable working
 * sidecar (right). The tree is schema-driven (useTree → whatever container types
 * the deployment profile declares); selecting a node navigates to its record.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useCatalogs } from "@/composables/useCatalogs";
import { useRepository } from "@/composables/useRepository";
import { useTreeGraph } from "@/composables/useTreeGraph";
import { useAuthStore } from "@/stores/auth";
import type { TreeNode as TreeNodeData } from "@/data/sampleRecord";
import { apiBase } from "@/api/rdf";
import CatalogCard from "@/components/metadata/CatalogCard.vue";
import TreeNode from "@/components/metadata/TreeNode.vue";
import MetaItem from "@/components/metadata/MetaItem.vue";
import RdfPreviewPanel from "@/components/metadata/RdfPreviewPanel.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const { data: repo } = useRepository();
const { data: catalogs, isLoading } = useCatalogs();
const { data: containers, isLoading: treeLoading } = useTreeGraph();

const newCatalogLink = computed(() => `/create/catalog?parent=${encodeURIComponent(apiBase())}`);
// Neutral fallback while the root record loads (or fails to): the deployment
// host, never sample branding (interface note 12.1 — no sample text in the shell).
const hostLabel = computed(() => {
  try {
    return new URL(apiBase()).host;
  } catch {
    return "FAIR Data Point";
  }
});
const repoTitle = computed(() => repo.value?.title || hostLabel.value);
const repoDescription = computed(() => repo.value?.description || "");
const catalogCount = computed(() => catalogs.value?.length ?? 0);
const totalRecords = computed(() => (catalogs.value ?? []).reduce((s, c) => s + c.distributions, 0));

// Persistent container tree: repository root → catalogs → datasets/data-services,
// built over SPARQL (useTreeGraph) so it nests to full depth and populates for
// anonymous visitors (the /page extension is policy-gated). Levels below the root
// are collapsed by default; expanding a node is instant (the forest is preloaded).
const treeData = computed<TreeNodeData>(() => {
  const children = containers.value ?? [];
  return {
    id: "",
    label: repoTitle.value,
    children,
    ...(children.length ? { count: children.length } : {}),
  };
});

// The root is the active node; selecting a child container opens its record.
function navigate(id: string) {
  if (!id) void router.push("/");
  else void router.push(`/records/${id}`);
}
</script>

<template>
  <div class="browse">
    <!-- Left: persistent container tree -->
    <aside class="pane tree-pane" :aria-label="t('metadata.containersAria')">
      <div class="eyebrow mono">{{ t("metadata.containers") }}</div>
      <div v-if="treeLoading" class="pane-hint">{{ t("common.loading") }}</div>
      <div v-else class="tree" role="tree">
        <TreeNode :node="treeData" :depth="0" :active-path="['']" @navigate="navigate" />
      </div>
    </aside>

    <!-- Center: the repository record + its catalogs -->
    <section class="center">
      <nav class="crumbs" :aria-label="t('metadata.breadcrumbAria')">
        <span class="crumb current">{{ repoTitle }}</span>
      </nav>
      <div class="type-eyebrow mono">{{ t("metadata.eyebrow") }}</div>
      <div class="title-row">
        <h1>{{ repoTitle }}</h1>
        <RouterLink v-if="auth.isSteward" to="/repository/edit" class="btn sm">
          <AppIcon name="edit" :size="12" /> {{ t("metadata.editRepository") }}
        </RouterLink>
      </div>
      <p class="lede">{{ repoDescription || t("metadata.defaultDescription") }}</p>

      <div class="section-head">
        <h2>{{ t("metadata.catalogsHeading") }}</h2>
        <RouterLink v-if="auth.isSteward" :to="newCatalogLink" class="btn sm new-catalog">
          <AppIcon name="plus" :size="12" /> {{ t("metadata.newCatalog") }}
        </RouterLink>
        <span class="count mono">{{
          t("metadata.countOf", { shown: catalogCount, total: catalogCount })
        }}</span>
      </div>
      <div v-if="isLoading" class="pane-hint">{{ t("common.loading") }}</div>
      <div v-else class="list">
        <CatalogCard v-for="c in catalogs" :key="c.id" :catalog="c" />
      </div>
    </section>

    <!-- Right: working sidecar -->
    <aside class="pane sidecar-pane" :aria-label="t('metadata.aboutAria')">
      <MetaItem :label="t('metadata.metaCatalogs')">{{
        t("metadata.metaCatalogsValue", { catalogs: catalogCount, records: totalRecords })
      }}</MetaItem>
      <div class="gap" />
      <MetaItem :label="t('metadata.metaConformsTo')" mono>FDP Spec 1.2 · DCAT-AP 3.0</MetaItem>
      <div class="gap" />
      <MetaItem :label="t('metadata.metaLicense')">{{ t("metadata.metaLicenseValue") }}</MetaItem>
      <div class="gap" />
      <RdfPreviewPanel record-id="" />
    </aside>
  </div>
</template>

<style scoped>
.browse {
  flex: 1;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr) 340px;
  align-items: start;
  min-height: 0;
}

/* Panes */
.pane {
  padding: 24px 20px;
  min-height: 100%;
}
.tree-pane {
  border-right: 1px solid var(--fair-separator);
  background: var(--fair-bg);
  position: sticky;
  top: var(--fair-header-h);
  align-self: stretch;
}
.sidecar-pane {
  border-left: 1px solid var(--fair-separator);
  background: var(--fair-bg);
}
.eyebrow {
  font-size: var(--fair-text-xs);
  color: var(--fair-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  margin-bottom: 14px;
}
.pane-hint {
  color: var(--fair-text-muted);
  font-size: var(--fair-text-base);
  padding: 8px 4px;
}

/* Center */
.center {
  padding: 28px var(--fair-gutter) 48px;
  min-width: 0;
}
.crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fair-text-sm);
  color: var(--fair-text-muted);
  margin-bottom: 14px;
}
.crumb.current {
  color: var(--fair-text);
}
.type-eyebrow {
  font-size: var(--fair-text-sm);
  color: var(--fair-node-darker);
  letter-spacing: var(--fair-tracking-tight);
  margin-bottom: 6px;
}
.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.title-row h1 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-bold);
  font-size: var(--fair-text-display);
  line-height: var(--fair-leading-tight);
  letter-spacing: var(--fair-tracking-display);
  color: var(--fair-text-strong);
}
.lede {
  /* Preserve authored line breaks in multi-paragraph descriptions. */
  white-space: pre-line;
  margin: 12px 0 0;
  font-family: var(--fair-font-sans);
  font-size: var(--fair-text-md);
  line-height: var(--fair-leading-normal);
  color: var(--fair-text);
  max-width: 60ch;
}

.section-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin: 36px 0 16px;
}
.section-head h2 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-semibold);
  font-size: var(--fair-text-sm);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  color: var(--fair-text-muted);
}
.new-catalog {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.count {
  margin-left: auto;
  font-size: var(--fair-text-sm);
  color: var(--fair-text-light);
}
.list {
  display: grid;
  gap: 14px;
}
.gap {
  height: 12px;
}

@media (max-width: 1100px) {
  .browse {
    grid-template-columns: 220px minmax(0, 1fr);
  }
  .sidecar-pane {
    display: none;
  }
}
@media (max-width: 760px) {
  .browse {
    grid-template-columns: 1fr;
  }
  .tree-pane {
    display: none;
  }
}
</style>
