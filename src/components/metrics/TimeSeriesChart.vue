<script setup lang="ts">
/**
 * Line chart for the views/downloads/queries time series. Token-driven
 * colours so the chart respects the active theme.
 */
import { computed, onMounted, ref, watchEffect } from "vue";
import { Line } from "vue-chartjs";
import type { ChartData, ChartOptions } from "chart.js";
import { registerCharts } from "@/charts/register";
import type { TimeSeriesPoint } from "@/data/sampleMetrics";

registerCharts();

const props = defineProps<{
  points: TimeSeriesPoint[];
  /** Which series to render. Defaults to all three. */
  fields?: Array<"views" | "downloads" | "queries">;
}>();

const tokens = ref({ ink: "#14181F", muted: "#6b7280", line: "#e6e2d8", accent: "#2D5B89", ok: "#2F7A4A", signal: "#B5532A" });

function readTokens() {
  if (typeof document === "undefined") return;
  const cs = window.getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  tokens.value = {
    ink: read("--ink", tokens.value.ink),
    muted: read("--muted", tokens.value.muted),
    line: read("--line", tokens.value.line),
    accent: read("--accent", tokens.value.accent),
    ok: read("--ok", tokens.value.ok),
    signal: read("--signal", tokens.value.signal),
  };
}

onMounted(readTokens);

// Re-read tokens when the theme class flips so chart colours follow the theme.
if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  const obs = new MutationObserver(() => readTokens());
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

const fields = computed(() => props.fields ?? (["views", "downloads", "queries"] as const));

const series = {
  views: { label: "Views", color: () => tokens.value.accent },
  downloads: { label: "Downloads", color: () => tokens.value.ok },
  queries: { label: "Queries", color: () => tokens.value.signal },
} as const;

const labels = computed(() =>
  props.points.map((p) => {
    const d = new Date(p.t);
    return p.t.length === 10
      ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }),
);

const chartData = computed<ChartData<"line">>(() => ({
  labels: labels.value,
  datasets: fields.value.map((f) => ({
    label: series[f].label,
    data: props.points.map((p) => p[f]),
    borderColor: series[f].color(),
    backgroundColor: series[f].color() + "22",
    fill: true,
    tension: 0.35,
    pointRadius: 0,
    pointHoverRadius: 4,
    borderWidth: 2,
  })),
}));

const chartOptions = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: tokens.value.muted, font: { size: 11 } },
      border: { color: tokens.value.line },
    },
    y: {
      grid: { color: tokens.value.line },
      ticks: { color: tokens.value.muted, font: { size: 11 } },
      border: { display: false },
      beginAtZero: true,
    },
  },
  plugins: {
    legend: {
      display: true,
      position: "bottom" as const,
      labels: { color: tokens.value.ink, font: { size: 12 }, boxWidth: 12, boxHeight: 12 },
    },
    tooltip: {
      backgroundColor: tokens.value.ink,
      titleColor: "#fff",
      bodyColor: "#fff",
      padding: 10,
    },
  },
}));

// Keep watchEffect referenced so theme switches refresh the chart instance.
watchEffect(() => void chartOptions.value);
</script>

<template>
  <div class="chart">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart {
  position: relative;
  height: 280px;
}
</style>
