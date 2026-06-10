/**
 * Operational endpoints — `GET /info` (build/runtime metadata) and
 * `GET /readyz` (dependency readiness probe).
 *
 * `/fdp-api/info` is public and cheap; the footer shows it on every page. Build fields
 * (`commit`, `built_at`) are null on a locally-developed checkout, in which
 * case we render "(unknown build)".
 *
 * `/fdp-api/readyz` returns **503** with a full `ReadinessReport` body when something
 * is down (not just on success), so we widen Axios's accepted status range and
 * read the body in both cases rather than throwing on 503.
 */

import { http } from "./http";
import type { components } from "./schema";

export type AppInfo = components["schemas"]["AppInfo"];
export type ReadinessReport = components["schemas"]["ReadinessReport"];

/** Fetch server build + runtime metadata. */
export async function fetchAppInfo(): Promise<AppInfo> {
  const res = await http.get<AppInfo>("/fdp-api/info");
  return res.data;
}

/**
 * Fetch the dependency readiness report. The server answers 200 when ready and
 * 503 when not — both carry the same `ReadinessReport` body, so we accept 503
 * and surface the per-check detail instead of treating it as a failure.
 */
export async function fetchReadiness(): Promise<ReadinessReport> {
  const res = await http.get<ReadinessReport>("/fdp-api/readyz", {
    validateStatus: (status) => status === 200 || status === 503,
  });
  return res.data;
}

/**
 * Short human label for the server build: the abbreviated commit when known,
 * otherwise the environment, otherwise "(unknown build)". Used in the footer.
 */
export function buildLabel(info: AppInfo): string {
  if (info.build.commit) return info.build.commit.slice(0, 7);
  if (info.environment) return info.environment;
  return "(unknown build)";
}

/** Names of the dependencies whose check did not pass. */
export function failedChecks(report: ReadinessReport): string[] {
  return Object.entries(report.checks)
    .filter(([, outcome]) => outcome.status !== "ok")
    .map(([name]) => name);
}
