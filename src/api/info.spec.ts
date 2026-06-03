/**
 * Unit tests for the operational `/info` + `/readyz` layer.
 *
 * `http` is mocked so the fetchers and label helpers are exercised against
 * canned server responses. `/readyz` is the interesting one: it answers 503
 * with a body when degraded, so we assert the fetcher widens the accepted
 * status range rather than throwing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn() } }));

import { http } from "@/api/http";
import {
  buildLabel,
  failedChecks,
  fetchAppInfo,
  fetchReadiness,
  type AppInfo,
  type ReadinessReport,
} from "./info";

// eslint-disable-next-line @typescript-eslint/unbound-method -- mocking a method reference
const mockGet = vi.mocked(http.get);

const tagged: AppInfo = {
  name: "fdp-server",
  version: "0.1.0",
  environment: "production",
  build: { commit: "abc1234def5678", built_at: "2026-05-01T10:00:00Z" },
  runtime: { python_version: "3.14.4" },
};

const local: AppInfo = {
  name: "fdp-server",
  version: "0.1.0",
  environment: "development",
  build: { commit: null, built_at: null },
  runtime: { python_version: "3.14.4" },
};

beforeEach(() => {
  mockGet.mockReset();
});

describe("fetchAppInfo", () => {
  it("returns the server's AppInfo body", async () => {
    mockGet.mockResolvedValueOnce({ data: tagged });
    await expect(fetchAppInfo()).resolves.toEqual(tagged);
    expect(mockGet).toHaveBeenCalledWith("/info");
  });
});

describe("fetchReadiness", () => {
  it("accepts a 200 ready report", async () => {
    const ready: ReadinessReport = {
      status: "ready",
      checks: { postgres: { status: "ok" }, oidc: { status: "ok" } },
    };
    mockGet.mockResolvedValueOnce({ data: ready });
    await expect(fetchReadiness()).resolves.toEqual(ready);
  });

  it("treats 503 as a valid response, not an error", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        status: "not_ready",
        checks: { postgres: { status: "fail", error: "refused" } },
      },
    });
    await fetchReadiness();
    // The fetcher must opt 503 into Axios's accepted statuses.
    const opts = mockGet.mock.calls[0][1] as { validateStatus: (s: number) => boolean };
    expect(opts.validateStatus(200)).toBe(true);
    expect(opts.validateStatus(503)).toBe(true);
    expect(opts.validateStatus(500)).toBe(false);
  });
});

describe("buildLabel", () => {
  it("uses the short commit when the build is tagged", () => {
    expect(buildLabel(tagged)).toBe("abc1234");
  });

  it("falls back to the environment for a local checkout", () => {
    expect(buildLabel(local)).toBe("development");
  });

  it("renders an explicit placeholder when nothing identifies the build", () => {
    expect(buildLabel({ ...local, environment: "" })).toBe("(unknown build)");
  });
});

describe("failedChecks", () => {
  it("names only the dependencies whose check did not pass", () => {
    const report: ReadinessReport = {
      status: "not_ready",
      checks: {
        postgres: { status: "fail" },
        triplestore: { status: "ok" },
        oidc: { status: "fail" },
      },
    };
    expect(failedChecks(report).sort()).toEqual(["oidc", "postgres"]);
  });

  it("is empty when everything is up", () => {
    const report: ReadinessReport = {
      status: "ready",
      checks: { postgres: { status: "ok" } },
    };
    expect(failedChecks(report)).toEqual([]);
  });
});
