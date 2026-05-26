import { describe, expect, it } from "vitest";
import { buildOverview, buildResourceMetrics, type TimeRange } from "@/data/sampleMetrics";

describe("metrics fixture builders", () => {
  it("produces the expected daily-aggregation length per range", () => {
    const cases: [TimeRange, number][] = [
      ["24h", 24],
      ["7d", 7],
      ["30d", 30],
      ["90d", 90],
    ];
    for (const [range, expected] of cases) {
      expect(buildOverview(range).series).toHaveLength(expected);
    }
  });

  it("totals roll up consistently with the daily series", () => {
    const o = buildOverview("30d");
    const expectedViews = o.series.reduce((a, b) => a + b.views, 0);
    const expectedDownloads = o.series.reduce((a, b) => a + b.downloads, 0);
    expect(o.kpis.totalViews).toBe(expectedViews);
    expect(o.kpis.totalDownloads).toBe(expectedDownloads);
  });

  it("populates a country row for the 'unknown / VPN / cloud' bucket", () => {
    const o = buildOverview("7d");
    const unknown = o.countries.find((c) => c.code === "??");
    expect(unknown).toBeDefined();
    expect(unknown!.label.toLowerCase()).toContain("unknown");
  });

  it("buildResourceMetrics carries the resourceId and the requested range", () => {
    const r = buildResourceMetrics("ad-cohort-2024", "7d");
    expect(r.resourceId).toBe("ad-cohort-2024");
    expect(r.range).toBe("7d");
    expect(r.series).toHaveLength(7);
  });
});
