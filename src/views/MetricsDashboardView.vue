<script setup lang="ts">
/**
 * Metrics dashboard.
 *
 * Renders exactly what the server's `/metrics/*` API reports: request counts,
 * unique visitors, average latency, HTTP status classes, top resources (by
 * IRI), and country-code aggregates. It deliberately does NOT show a
 * views/downloads/queries split, period-over-period deltas, or human resource
 * titles — the server doesn't provide them.
 *
 * The endpoints require authentication, so anonymous visitors see a sign-in
 * prompt rather than empty panels. The "Privacy disclaimer" disclosure makes the
 * collection boundary explicit.
 */
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { useFormat } from "@/composables/useFormat";
import { useMetricsOverview, useResourceMetrics } from "@/composables/useMetrics";
import { apiBase } from "@/api/rdf";
import type { TimeRange } from "@/api/metrics";
import KpiCard from "@/components/metrics/KpiCard.vue";
import TimeSeriesChart from "@/components/metrics/TimeSeriesChart.vue";
import TopRecordsList from "@/components/metrics/TopRecordsList.vue";
import GeoDistribution from "@/components/metrics/GeoDistribution.vue";
import TimeRangePicker from "@/components/metrics/TimeRangePicker.vue";
import PrivacyDisclosure from "@/components/metrics/PrivacyDisclosure.vue";

const { t } = useI18n();
const auth = useAuthStore();
const range = ref<TimeRange>("30d");

const { data: overview, isLoading } = useMetricsOverview(range);

// Distinguish a genuinely empty period from a bug: metrics aggregate on a
// schedule, so recent activity can lag before it shows up here.
const isEmpty = computed(
  () =>
    !!overview.value &&
    overview.value.kpis.requests === 0 &&
    overview.value.series.length === 0,
);

// The resource-detail panel focuses one resource. Options come from the
// most-requested resources (the API carries their path id; rebuild the full
// IRI the resource-metrics endpoint expects). Default to the top one once the
// overview loads, keeping the user's pick if they choose another.
const resourceOptions = computed(() =>
  (overview.value?.topResources ?? []).map((r) => ({
    iri: `${apiBase()}/${r.id}`,
    label: r.label,
  })),
);
const focusResource = ref("");
watch(
  resourceOptions,
  (opts) => {
    if (!opts.length) return;
    if (!focusResource.value || !opts.some((o) => o.iri === focusResource.value)) {
      focusResource.value = opts[0]?.iri ?? "";
    }
  },
  { immediate: true },
);
const focusResourceRef = computed(() => focusResource.value);
const { data: resource } = useResourceMetrics(focusResourceRef, range);

const { formatNumber } = useFormat();
function fmt(n: number): string {
  return formatNumber(n);
}
function latency(ms: number | null): string {
  return ms === null ? "—" : t("metrics.latencyMs", { ms: Math.round(ms) });
}
</script>

<template>
  <section class="page">
    <header class="page__head">
      <div>
        <div class="eyebrow mono">{{ t("metrics.eyebrow") }}</div>
        <h1>{{ t("metrics.heading") }}</h1>
        <i18n-t keypath="metrics.lede" tag="p" class="lede" scope="global">
          <template #privacyLink><em>{{ t("metrics.ledePrivacyLink") }}</em></template>
        </i18n-t>
      </div>
      <div class="page__controls">
        <TimeRangePicker v-model="range" />
        <PrivacyDisclosure />
      </div>
    </header>

    <div v-if="!auth.isAuthenticated" class="signin">
      <h2>{{ t("metrics.signinHeading") }}</h2>
      <p>{{ t("metrics.signinBody") }}</p>
      <button class="btn primary" @click="auth.login('/metrics')">{{ t("metrics.signin") }}</button>
    </div>

    <div v-else-if="isLoading" class="loading">{{ t("metrics.loading") }}</div>

    <template v-else-if="overview">
      <div v-if="isEmpty" class="empty-note" role="status">
        <strong>{{ t("metrics.emptyHeading") }}</strong>
        <p>
          {{ t("metrics.emptyBody") }}
        </p>
      </div>

      <section class="kpis">
        <KpiCard :label="t('metrics.kpiRequests')" :value="fmt(overview.kpis.requests)" />
        <KpiCard
          :label="t('metrics.kpiUniqueVisitors')"
          :value="fmt(overview.kpis.uniqueVisitors)"
          :hint="t('metrics.kpiUniqueVisitorsHint')"
        />
        <KpiCard :label="t('metrics.kpiAvgLatency')" :value="latency(overview.kpis.avgLatencyMs)" />
        <KpiCard
          :label="t('metrics.kpiErrors4xx')"
          :value="fmt(overview.status.s4xx)"
          :hint="t('metrics.kpiErrors4xxHint')"
        />
        <KpiCard
          :label="t('metrics.kpiErrors5xx')"
          :value="fmt(overview.status.s5xx)"
          :hint="t('metrics.kpiErrors5xxHint')"
        />
      </section>

      <section class="grid">
        <article class="panel chart-panel">
          <header class="panel__head">
            <h2>{{ t("metrics.panelActivity") }}</h2>
            <span class="muted small">{{ t("metrics.panelActivitySub") }}</span>
          </header>
          <TimeSeriesChart :points="overview.series" />
        </article>

        <article class="panel">
          <header class="panel__head">
            <h2>{{ t("metrics.panelGeo") }}</h2>
            <span class="muted small">{{ t("metrics.panelGeoSub") }}</span>
          </header>
          <GeoDistribution :rows="overview.countries" />
        </article>
      </section>

      <section class="panel">
        <header class="panel__head">
          <h2>{{ t("metrics.panelTopResources") }}</h2>
          <span class="muted small">{{ t("metrics.panelTopResourcesSub", { n: overview.topResources.length }) }}</span>
        </header>
        <TopRecordsList :rows="overview.topResources" />
      </section>

      <section v-if="focusResource && resource" class="panel">
        <header class="panel__head">
          <h2>{{ t("metrics.panelResourceDetail") }}</h2>
          <select
            v-if="resourceOptions.length"
            v-model="focusResource"
            class="resource-select"
            :aria-label="t('metrics.chooseResource')"
          >
            <option v-for="o in resourceOptions" :key="o.iri" :value="o.iri">
              {{ o.label }}
            </option>
          </select>
        </header>
        <div class="resource__summary">
          <KpiCard :label="t('metrics.kpiRequests')" :value="fmt(resource.requests)" />
          <KpiCard :label="t('metrics.kpiUniqueVisitors')" :value="fmt(resource.uniqueVisitors)" />
        </div>
        <TimeSeriesChart :points="resource.series" />
      </section>
    </template>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 80px 48px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: var(--fair-bg);
}
.page__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.page__controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.eyebrow {
  font-size: 11px;
  color: var(--fair-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
h1 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 36px;
  line-height: 1.15;
  letter-spacing: -0.005em;
  color: var(--fair-text-strong);
}
.lede {
  margin: 8px 0 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.55;
  color: var(--fair-text);
  max-width: 620px;
}
.lede em {
  font-style: normal;
  color: var(--tool-accent);
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 18px;
}

.panel {
  padding: 20px 22px;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
}
.chart-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.panel__head h2 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-muted);
}
.small {
  font-size: 12px;
}
.muted {
  color: var(--fair-text-muted);
}

.resource-select {
  font-family: var(--fair-font-sans);
  font-size: 12px;
  max-width: 50%;
  padding: 4px 8px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-sm);
  background: var(--fair-surface);
  color: var(--fair-text);
}
.resource__summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 18px;
}

.loading {
  padding: 60px 20px;
  color: var(--fair-text-muted);
  text-align: center;
}
.empty-note {
  padding: 16px 18px;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  background: var(--fair-highlight);
  color: var(--fair-text);
}
.empty-note strong {
  color: var(--fair-text-strong);
  font-size: 14px;
}
.empty-note p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--fair-text-muted);
  max-width: 620px;
}
.signin {
  padding: 60px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.signin h2 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 24px;
  color: var(--fair-text-strong);
}
.signin p {
  margin: 0;
  color: var(--fair-text-muted);
  font-size: 14px;
}
.signin .btn.primary {
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .page {
    padding: 28px 32px 40px;
  }
  .kpis {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
