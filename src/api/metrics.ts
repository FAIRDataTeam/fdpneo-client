/**
 * Metrics API — view models + fetchers over the server's `/fdp-api/metrics/*` endpoints.
 *
 * Deliberately mapped to what the server *actually* reports, not a richer
 * analytics shape. The server exposes request counts, unique visitors,
 * average latency, HTTP status-class counts, top resources by IRI, and
 * country-code aggregates. It does NOT split views/downloads/queries, does
 * not compute period-over-period deltas, and does not carry human-readable
 * resource titles — so the dashboard doesn't pretend to.
 *
 * The endpoints require authentication (anonymous calls get 401); the
 * composables in `useMetrics` only fire when the user is signed in.
 */

import { http } from "./http";
import { iriToId } from "./rdf";
import type { components } from "./schema";
import type { RecordKind } from "@/types/record";

type SummaryResponse = components["schemas"]["SummaryResponse"];
type DailySeriesResponse = components["schemas"]["DailySeriesResponse"];
type GeographyResponse = components["schemas"]["GeographyResponse"];
type TopResourcesResponse = components["schemas"]["TopResourcesResponse"];

export type TimeRange = "24h" | "7d" | "30d" | "90d";

const RANGE_DAYS: Record<TimeRange, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

/** Inclusive `since` date (YYYY-MM-DD) for a range, relative to today. */
export function sinceFor(range: TimeRange): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - RANGE_DAYS[range]);
  return d.toISOString().slice(0, 10);
}

export interface MetricsPoint {
  /** ISO date for the daily bucket. */
  t: string;
  requests: number;
  visitors: number;
}

export interface TopResourceRow {
  /** Path id, so it doubles as a `/records/:id` link target. */
  id: string;
  type: RecordKind;
  typeLabel: string;
  /** Best-effort label from the IRI — the server carries no human title. */
  label: string;
  requests: number;
  visitors: number;
}

export interface CountryRow {
  /** ISO 3166-1 alpha-2, or "??" for unknown / unresolved. */
  code: string;
  label: string;
  requests: number;
  visitors: number;
}

export interface MetricsOverview {
  range: TimeRange;
  since: string;
  until: string;
  kpis: {
    requests: number;
    uniqueVisitors: number;
    avgLatencyMs: number | null;
    errors: number;
  };
  status: { s2xx: number; s3xx: number; s4xx: number; s5xx: number };
  series: MetricsPoint[];
  topResources: TopResourceRow[];
  countries: CountryRow[];
}

export interface ResourceMetrics {
  resourceIri: string;
  requests: number;
  uniqueVisitors: number;
  series: MetricsPoint[];
}

const TYPE_BY_PREFIX: Record<string, { type: RecordKind; label: string }> = {
  catalog: { type: "catalog", label: "Catalog" },
  dataset: { type: "dataset", label: "Dataset" },
  distribution: { type: "distribution", label: "Distribution" },
  "data-service": { type: "distribution", label: "Data service" },
};

function classifyIri(iri: string): { type: RecordKind; label: string } {
  const prefix = iriToId(iri).split("/")[0] ?? "";
  return TYPE_BY_PREFIX[prefix] ?? { type: "dataset", label: "Resource" };
}

// A pragmatic code→name map for the countries we expect to see; anything else
// falls back to the raw code so we never block on an exhaustive table.
const COUNTRY_NAMES: Record<string, string> = {
  NL: "Netherlands", DE: "Germany", GB: "United Kingdom", FR: "France",
  US: "United States", BE: "Belgium", SE: "Sweden", ES: "Spain", IT: "Italy",
  CH: "Switzerland", DK: "Denmark", NO: "Norway", FI: "Finland", IE: "Ireland",
  PL: "Poland", AT: "Austria", PT: "Portugal", CA: "Canada", AU: "Australia",
  JP: "Japan", CN: "China", IN: "India", BR: "Brazil",
};

function countryLabel(code: string | null | undefined): { code: string; label: string } {
  if (!code) return { code: "??", label: "Unknown" };
  return { code, label: COUNTRY_NAMES[code] ?? code };
}

function mapSeries(res: DailySeriesResponse): MetricsPoint[] {
  return res.points.map((p) => ({
    t: p.bucket,
    requests: p.request_count,
    visitors: p.unique_visitors,
  }));
}

async function getJson<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const res = await http.get<T>(path, { params });
  return res.data;
}

/** Fetch and assemble the deployment-wide overview for a range. */
export async function fetchOverview(range: TimeRange): Promise<MetricsOverview> {
  const since = sinceFor(range);
  const [summary, daily, geo, top] = await Promise.all([
    getJson<SummaryResponse>("/fdp-api/metrics/summary", { since }),
    getJson<DailySeriesResponse>("/fdp-api/metrics/timeseries/daily", { since }),
    getJson<GeographyResponse>("/fdp-api/metrics/geography", { since }),
    getJson<TopResourcesResponse>("/fdp-api/metrics/top-resources", { since, limit: 10 }),
  ]);

  return {
    range,
    since: summary.period.since,
    until: summary.period.until,
    kpis: {
      requests: summary.request_count,
      uniqueVisitors: summary.unique_visitors,
      avgLatencyMs: summary.latency_ms_avg,
      errors: summary.status_4xx_count + summary.status_5xx_count,
    },
    status: {
      s2xx: summary.status_2xx_count,
      s3xx: summary.status_3xx_count,
      s4xx: summary.status_4xx_count,
      s5xx: summary.status_5xx_count,
    },
    series: mapSeries(daily),
    topResources: top.items.map((item) => {
      const { type, label } = classifyIri(item.resource_iri);
      return {
        id: iriToId(item.resource_iri),
        type,
        typeLabel: label,
        label: iriToId(item.resource_iri),
        requests: item.request_count,
        visitors: item.unique_visitors,
      };
    }),
    countries: geo.countries.map((c) => ({
      ...countryLabel(c.country_code),
      requests: c.request_count,
      visitors: c.unique_visitors,
    })),
  };
}

/** Fetch metrics scoped to a single resource IRI. */
export async function fetchResourceMetrics(
  resourceIri: string,
  range: TimeRange,
): Promise<ResourceMetrics> {
  const since = sinceFor(range);
  const [summary, daily] = await Promise.all([
    getJson<SummaryResponse>("/fdp-api/metrics/summary", { since, resource_iri: resourceIri }),
    getJson<DailySeriesResponse>("/fdp-api/metrics/timeseries/daily", { since, resource_iri: resourceIri }),
  ]);
  return {
    resourceIri,
    requests: summary.request_count,
    uniqueVisitors: summary.unique_visitors,
    series: mapSeries(daily),
  };
}
