/**
 * Unit tests for the metrics fetch/mapping layer.
 *
 * `http` is mocked so the mappers are exercised against canned server
 * responses; `VITE_FDP_API_URL` is stubbed so IRI → path-id classification
 * behaves as it does in the app.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn() } }));

import { http } from "@/api/http";
import { fetchOverview, sinceFor } from "./metrics";

// eslint-disable-next-line @typescript-eslint/unbound-method -- mocking a method reference
const mockGet = vi.mocked(http.get);

const PERIOD = { since: "2026-04-29", until: "2026-05-29" };

beforeEach(() => {
  vi.stubEnv("VITE_FDP_API_URL", "http://localhost:8000");
  mockGet.mockImplementation((url: string) => {
    switch (url) {
      case "/fdp-api/metrics/summary":
        return Promise.resolve({
          data: {
            period: PERIOD,
            request_count: 1500,
            unique_visitors: 430,
            latency_ms_avg: 182.4,
            status_2xx_count: 1400,
            status_3xx_count: 20,
            status_4xx_count: 70,
            status_5xx_count: 10,
          },
        });
      case "/fdp-api/metrics/timeseries/daily":
        return Promise.resolve({
          data: {
            period: PERIOD,
            points: [
              { bucket: "2026-05-01", request_count: 50, unique_visitors: 20 },
              { bucket: "2026-05-02", request_count: 60, unique_visitors: 25 },
            ],
          },
        });
      case "/fdp-api/metrics/geography":
        return Promise.resolve({
          data: {
            period: PERIOD,
            countries: [
              { country_code: "NL", request_count: 800, unique_visitors: 200 },
              { country_code: null, request_count: 50, unique_visitors: 20 },
            ],
          },
        });
      case "/fdp-api/metrics/top-resources":
        return Promise.resolve({
          data: {
            period: PERIOD,
            event_type: null,
            items: [
              { resource_iri: "http://localhost:8000/dataset/ad-cohort-2024", request_count: 412, unique_visitors: 120 },
              { resource_iri: "http://localhost:8000/catalog/cohort", request_count: 88, unique_visitors: 40 },
            ],
          },
        });
      default:
        return Promise.reject(new Error(`unexpected url ${url}`));
    }
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  mockGet.mockReset();
});

describe("sinceFor", () => {
  it("returns an ISO date in the past for each range", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const range of ["24h", "7d", "30d", "90d"] as const) {
      const since = sinceFor(range);
      expect(since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(since < today).toBe(true);
    }
  });
});

describe("fetchOverview", () => {
  it("maps summary fields to KPIs and status classes", async () => {
    const o = await fetchOverview("30d");
    expect(o.kpis).toEqual({ requests: 1500, uniqueVisitors: 430, avgLatencyMs: 182.4, errors: 80 });
    expect(o.status).toEqual({ s2xx: 1400, s3xx: 20, s4xx: 70, s5xx: 10 });
    expect(o.since).toBe("2026-04-29");
  });

  it("maps the daily series to requests/visitors points", async () => {
    const o = await fetchOverview("7d");
    expect(o.series).toEqual([
      { t: "2026-05-01", requests: 50, visitors: 20 },
      { t: "2026-05-02", requests: 60, visitors: 25 },
    ]);
  });

  it("labels countries and folds nulls into an unknown bucket", async () => {
    const o = await fetchOverview("30d");
    expect(o.countries[0]).toEqual({ code: "NL", label: "Netherlands", requests: 800, visitors: 200 });
    expect(o.countries[1]).toEqual({ code: "??", label: "Unknown", requests: 50, visitors: 20 });
  });

  it("classifies top resources from their IRI and keeps the path id", async () => {
    const o = await fetchOverview("30d");
    expect(o.topResources[0]).toEqual({
      id: "dataset/ad-cohort-2024",
      type: "dataset",
      typeLabel: "Dataset",
      label: "dataset/ad-cohort-2024",
      requests: 412,
      visitors: 120,
    });
    expect(o.topResources[1]?.type).toBe("catalog");
  });
});
