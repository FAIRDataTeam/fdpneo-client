<script setup lang="ts">
/**
 * Metrics dashboard.
 *
 * Renders only what the server's anonymous metrics API returns
 * (architecture §11). The route is public, but the steward "Your resources"
 * section appears once authenticated.
 *
 * Visual posture deliberately doesn't mirror Google-Analytics-style
 * dashboards — that aesthetic implies tracking the FDP doesn't actually do.
 * The "Privacy posture" disclosure makes the boundary explicit.
 */
import { computed, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useMetricsOverview, useResourceMetrics } from "@/composables/useMetrics";
import type { TimeRange } from "@/data/sampleMetrics";
import KpiCard from "@/components/metrics/KpiCard.vue";
import TimeSeriesChart from "@/components/metrics/TimeSeriesChart.vue";
import TopRecordsList from "@/components/metrics/TopRecordsList.vue";
import GeoDistribution from "@/components/metrics/GeoDistribution.vue";
import TimeRangePicker from "@/components/metrics/TimeRangePicker.vue";
import PrivacyDisclosure from "@/components/metrics/PrivacyDisclosure.vue";

const auth = useAuthStore();
const range = ref<TimeRange>("30d");

const { data: overview, isLoading } = useMetricsOverview(range);

// Stewards land on their most-owned record by default. When the API is in,
// drive this from a "my records" endpoint sorted by ownership.
const focusResource = ref("ad-cohort-2024");
const focusResourceRef = computed(() => focusResource.value);
const { data: resource } = useResourceMetrics(focusResourceRef, range);

const numberFmt = new Intl.NumberFormat();
function fmt(n: number): string {
  return numberFmt.format(n);
}
</script>

<template>
  <section class="page">
    <header class="page__head">
      <div>
        <div class="eyebrow mono">FDP Neo · Metrics</div>
        <h1>Usage at a glance</h1>
        <p class="lede">
          Aggregate, anonymous traffic across this deployment. Click
          <em>Privacy posture</em> for the data we deliberately don't collect.
        </p>
      </div>
      <div class="page__controls">
        <TimeRangePicker v-model="range" />
        <PrivacyDisclosure />
      </div>
    </header>

    <div v-if="isLoading" class="loading">Loading metrics…</div>

    <template v-else-if="overview">
      <section class="kpis">
        <KpiCard
          label="Views"
          :value="fmt(overview.kpis.totalViews)"
          :delta="overview.deltas.totalViewsPct"
        />
        <KpiCard
          label="Downloads"
          :value="fmt(overview.kpis.totalDownloads)"
          :delta="overview.deltas.totalDownloadsPct"
        />
        <KpiCard
          label="Unique visitors"
          :value="fmt(overview.kpis.uniqueVisitors)"
          :delta="overview.deltas.uniqueVisitorsPct"
          hint="rotates daily"
        />
        <KpiCard
          label="Query latency"
          :value="`${overview.kpis.avgQueryLatencyMs} ms`"
          :delta="overview.deltas.avgQueryLatencyMsDelta"
          delta-unit="ms"
          :delta-is-good="overview.deltas.avgQueryLatencyMsDelta < 0"
        />
      </section>

      <section class="grid">
        <article class="panel chart-panel">
          <header class="panel__head">
            <h2>Activity over time</h2>
            <span class="muted small">Views, downloads, queries</span>
          </header>
          <TimeSeriesChart :points="overview.series" />
        </article>

        <article class="panel">
          <header class="panel__head">
            <h2>Where visitors are</h2>
            <span class="muted small">Country granularity</span>
          </header>
          <GeoDistribution :rows="overview.countries" />
        </article>
      </section>

      <section class="panel">
        <header class="panel__head">
          <h2>Most-viewed records</h2>
          <span class="muted small">Top {{ overview.topRecords.length }} in this range</span>
        </header>
        <TopRecordsList :rows="overview.topRecords" />
      </section>

      <section v-if="auth.isAuthenticated && resource" class="panel">
        <header class="panel__head">
          <h2>Your resources</h2>
          <span class="muted small mono">{{ resource.resourceId }}</span>
        </header>
        <div class="resource__summary">
          <KpiCard label="Views" :value="fmt(resource.totalViews)" />
          <KpiCard label="Downloads" :value="fmt(resource.totalDownloads)" />
        </div>
        <TimeSeriesChart :points="resource.series" :fields="['views', 'downloads']" />
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
  background: var(--paper);
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
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 36px;
  line-height: 1.15;
  letter-spacing: -0.005em;
  color: var(--ink);
}
.lede {
  margin: 8px 0 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 620px;
}
.lede em {
  font-style: normal;
  color: var(--accent);
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
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
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
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.small {
  font-size: 12px;
}
.muted {
  color: var(--muted);
}

.resource__summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 18px;
}

.loading {
  padding: 60px 20px;
  color: var(--muted);
  text-align: center;
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
