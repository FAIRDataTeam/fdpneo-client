<script setup lang="ts">
/**
 * Line chart for the requests / unique-visitors daily series. Token-driven
 * colours so the chart respects the active theme. These are the only two
 * series the server reports per day.
 */
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { Line } from "vue-chartjs";
import type { ChartData, ChartOptions } from "chart.js";
import { registerCharts } from "@/charts/register";
import { useFormat } from "@/composables/useFormat";
import type { MetricsPoint } from "@/api/metrics";

registerCharts();

const { t } = useI18n();
const { formatDate, locale } = useFormat();

const props = defineProps<{
  points: MetricsPoint[];
  /** Which series to render. Defaults to both. */
  fields?: Array<"requests" | "visitors">;
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

// Re-read tokens when the theme class flips so chart colours follow the theme.
// The observer is created on mount and disconnected on unmount — the dashboard
// remounts charts on every range/resource change, so an undisconnected observer
// would leak one (plus its token closure) per remount.
let themeObserver: MutationObserver | undefined;

onMounted(() => {
  readTokens();
  if (typeof MutationObserver !== "undefined") {
    themeObserver = new MutationObserver(() => readTokens());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
});

onBeforeUnmount(() => themeObserver?.disconnect());

const fields = computed(() => props.fields ?? (["requests", "visitors"] as const));

const series = {
  requests: { label: () => t("metrics.seriesRequests"), color: () => tokens.value.accent },
  visitors: { label: () => t("metrics.seriesVisitors"), color: () => tokens.value.ok },
} as const;

const labels = computed(() => {
  // Reference the active locale so labels re-format when the language switches.
  void locale.value;
  return props.points.map((p) => {
    const d = new Date(p.t);
    return p.t.length === 10
      ? formatDate(d, { month: "short", day: "numeric" })
      : formatDate(d, { hour: "2-digit", minute: "2-digit" });
  });
});

const chartData = computed<ChartData<"line">>(() => ({
  labels: labels.value,
  datasets: fields.value.map((f) => ({
    label: series[f].label(),
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
