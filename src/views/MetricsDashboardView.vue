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
import { computed, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useMetricsOverview, useResourceMetrics } from "@/composables/useMetrics";
import { apiBase } from "@/api/rdf";
import type { TimeRange } from "@/api/metrics";
import KpiCard from "@/components/metrics/KpiCard.vue";
import TimeSeriesChart from "@/components/metrics/TimeSeriesChart.vue";
import TopRecordsList from "@/components/metrics/TopRecordsList.vue";
import GeoDistribution from "@/components/metrics/GeoDistribution.vue";
import TimeRangePicker from "@/components/metrics/TimeRangePicker.vue";
import PrivacyDisclosure from "@/components/metrics/PrivacyDisclosure.vue";

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

// Stewards land on a representative resource by default. When a "my records"
// endpoint exists, drive this from ownership.
const focusResource = ref(`${apiBase()}/dataset/ad-cohort-2024`);
const focusResourceRef = computed(() => focusResource.value);
const { data: resource } = useResourceMetrics(focusResourceRef, range);

const numberFmt = new Intl.NumberFormat();
function fmt(n: number): string {
  return numberFmt.format(n);
}
function latency(ms: number | null): string {
  return ms === null ? "—" : `${Math.round(ms)} ms`;
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
          <em>Privacy disclaimer</em> for the data we deliberately don't collect.
        </p>
      </div>
      <div class="page__controls">
        <TimeRangePicker v-model="range" />
        <PrivacyDisclosure />
      </div>
    </header>

    <div v-if="!auth.isAuthenticated" class="signin">
      <h2>Sign in to view metrics</h2>
      <p>Usage metrics are available to authenticated users.</p>
      <button class="btn primary" @click="auth.login('/metrics')">Sign in</button>
    </div>

    <div v-else-if="isLoading" class="loading">Loading metrics…</div>

    <template v-else-if="overview">
      <div v-if="isEmpty" class="empty-note" role="status">
        <strong>No activity recorded for this range yet.</strong>
        <p>
          Metrics are aggregated on a schedule, so recent visits can take a while
          to appear here. On a fresh deployment, browse a few records and check
          back later — or widen the time range.
        </p>
      </div>

      <section class="kpis">
        <KpiCard label="Requests" :value="fmt(overview.kpis.requests)" />
        <KpiCard
          label="Unique visitors"
          :value="fmt(overview.kpis.uniqueVisitors)"
          hint="rotates daily"
        />
        <KpiCard label="Avg latency" :value="latency(overview.kpis.avgLatencyMs)" />
        <KpiCard
          label="4xx + 5xx"
          :value="fmt(overview.kpis.errors)"
          hint="error responses"
        />
      </section>

      <section class="grid">
        <article class="panel chart-panel">
          <header class="panel__head">
            <h2>Activity over time</h2>
            <span class="muted small">Requests · unique visitors</span>
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
          <h2>Most-requested resources</h2>
          <span class="muted small">Top {{ overview.topResources.length }} in this range</span>
        </header>
        <TopRecordsList :rows="overview.topResources" />
      </section>

      <section v-if="resource" class="panel">
        <header class="panel__head">
          <h2>Resource detail</h2>
          <span class="muted small mono">{{ resource.resourceIri }}</span>
        </header>
        <div class="resource__summary">
          <KpiCard label="Requests" :value="fmt(resource.requests)" />
          <KpiCard label="Unique visitors" :value="fmt(resource.uniqueVisitors)" />
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
.empty-note {
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface-2);
  color: var(--ink-2);
}
.empty-note strong {
  color: var(--ink);
  font-size: 14px;
}
.empty-note p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--muted);
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
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 24px;
  color: var(--ink);
}
.signin p {
  margin: 0;
  color: var(--muted);
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
