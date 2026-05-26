/**
 * Temporary metrics fixture.
 *
 * Mirrors the shape the server's anonymous-metrics API will return per ADR-0002
 * and the architecture doc §11. Swap for OpenAPI-generated types once Task 0.2
 * lands.
 *
 * Privacy boundaries baked into the shape:
 *   - no per-event records, only daily aggregates
 *   - unique-visitor counts rotate daily (no cross-day tracking field)
 *   - no query text, no user identifiers
 */

import type { RecordKind } from "@/types/record";

export type TimeRange = "24h" | "7d" | "30d" | "90d";

export interface TimeSeriesPoint {
  /** ISO date string for daily aggregates, ISO datetime for the 24h range. */
  t: string;
  views: number;
  downloads: number;
  queries: number;
}

export interface TopRecordRow {
  id: string;
  type: RecordKind;
  typeLabel: string;
  title: string;
  views: number;
  downloads: number;
}

export interface CountryRow {
  /** ISO 3166-1 alpha-2 (country) or the literal "??" for "unknown / VPN / cloud". */
  code: string;
  label: string;
  visitors: number;
}

export interface MetricsOverview {
  range: TimeRange;
  generatedAt: string;
  kpis: {
    totalViews: number;
    totalDownloads: number;
    uniqueVisitors: number;
    avgQueryLatencyMs: number;
  };
  deltas: {
    totalViewsPct: number;
    totalDownloadsPct: number;
    uniqueVisitorsPct: number;
    avgQueryLatencyMsDelta: number;
  };
  series: TimeSeriesPoint[];
  topRecords: TopRecordRow[];
  countries: CountryRow[];
}

export interface ResourceMetrics {
  resourceId: string;
  range: TimeRange;
  series: TimeSeriesPoint[];
  totalViews: number;
  totalDownloads: number;
}

/**
 * Build N consecutive daily points ending today with a deterministic-but-
 * varied curve so charts look natural in dev. The numbers don't claim to be
 * realistic — they're scaffold data.
 */
function buildSeries(days: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const today = new Date("2026-05-26T00:00:00Z");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    // Smooth-ish wave + bump on weekends-ish so the chart has shape.
    const base = 28 + Math.round(14 * Math.sin(i / 4.5));
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6 ? 0.45 : 1;
    const views = Math.max(4, Math.round((base + i * 0.7) * weekend));
    const downloads = Math.max(0, Math.round(views * 0.18));
    const queries = Math.max(0, Math.round(views * 0.32 + 3));
    points.push({ t: d.toISOString().slice(0, 10), views, downloads, queries });
  }
  return points;
}

function build24hSeries(): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const today = new Date("2026-05-26T00:00:00Z");
  for (let h = 0; h < 24; h++) {
    const d = new Date(today);
    d.setUTCHours(h);
    const peak = 2 + Math.round(8 * Math.sin(((h - 7) / 24) * Math.PI));
    const views = Math.max(0, peak * (h >= 7 && h <= 19 ? 3 : 1));
    points.push({
      t: d.toISOString(),
      views,
      downloads: Math.round(views * 0.2),
      queries: Math.round(views * 0.35),
    });
  }
  return points;
}

function buildFor(range: TimeRange): TimeSeriesPoint[] {
  if (range === "24h") return build24hSeries();
  if (range === "7d") return buildSeries(7);
  if (range === "30d") return buildSeries(30);
  return buildSeries(90);
}

const TOP_RECORDS: TopRecordRow[] = [
  {
    id: "ad-cohort-2024",
    type: "dataset",
    typeLabel: "Dataset",
    title: "Alzheimer's Disease Cohort 2024 — Longitudinal MRI",
    views: 412,
    downloads: 38,
  },
  {
    id: "rot-mri-2023",
    type: "dataset",
    typeLabel: "Dataset",
    title: "Rotterdam Study — Cardiac MRI 2023 release",
    views: 286,
    downloads: 19,
  },
  {
    id: "park-mri",
    type: "dataset",
    typeLabel: "Dataset",
    title: "Parkinson Cohort — MRI follow-up 2024",
    views: 198,
    downloads: 12,
  },
  {
    id: "ad-biobank",
    type: "biobank",
    typeLabel: "Biobank",
    title: "AD Biobank — CSF samples 2018–2024",
    views: 121,
    downloads: 4,
  },
  {
    id: "ad-pub-2025",
    type: "publication",
    typeLabel: "Publication",
    title: "Subcortical atrophy patterns in early Alzheimer's disease",
    views: 86,
    downloads: 0,
  },
];

const COUNTRIES: CountryRow[] = [
  { code: "NL", label: "Netherlands", visitors: 184 },
  { code: "DE", label: "Germany", visitors: 96 },
  { code: "GB", label: "United Kingdom", visitors: 71 },
  { code: "FR", label: "France", visitors: 52 },
  { code: "US", label: "United States", visitors: 41 },
  { code: "BE", label: "Belgium", visitors: 28 },
  { code: "SE", label: "Sweden", visitors: 18 },
  { code: "??", label: "Unknown / VPN / cloud", visitors: 22 },
];

export function buildOverview(range: TimeRange): MetricsOverview {
  const series = buildFor(range);
  const totalViews = series.reduce((a, b) => a + b.views, 0);
  const totalDownloads = series.reduce((a, b) => a + b.downloads, 0);
  // Daily unique visitors are rotated daily by design — the dashboard shows
  // the most recent day's count, not a cross-day "unique" derivation.
  const uniqueVisitors = Math.round(totalViews * 0.42);
  return {
    range,
    generatedAt: "2026-05-26T08:30:00Z",
    kpis: {
      totalViews,
      totalDownloads,
      uniqueVisitors,
      avgQueryLatencyMs: 184,
    },
    deltas: {
      totalViewsPct: 12,
      totalDownloadsPct: 6,
      uniqueVisitorsPct: 4,
      avgQueryLatencyMsDelta: -22,
    },
    series,
    topRecords: TOP_RECORDS,
    countries: COUNTRIES,
  };
}

export function buildResourceMetrics(
  resourceId: string,
  range: TimeRange,
): ResourceMetrics {
  const series = buildFor(range);
  const totalViews = series.reduce((a, b) => a + b.views, 0);
  const totalDownloads = series.reduce((a, b) => a + b.downloads, 0);
  return { resourceId, range, series, totalViews, totalDownloads };
}
