/**
 * FDP Index targets admin client (server ADR-0025, `/fdp-api/index/*`).
 *
 * The set of FDP Indexes this deployment announces itself to: env-configured
 * entries (read-only, `source: "env"`) unioned with admin-registered runtime
 * rows, each carrying its last ping outcome. `POST /index/ping` announces to
 * every effective target immediately and returns per-target results. All
 * endpoints are admin-gated server-side (targets reveal deployment topology).
 */

import { http } from "./http";
import type { components } from "./schema";

export type IndexTargetInfo = components["schemas"]["IndexTargetInfo"];
export type IndexTargetCreateRequest = components["schemas"]["IndexTargetCreateRequest"];
export type PingResultView = components["schemas"]["PingResultView"];

export async function listIndexTargets(): Promise<IndexTargetInfo[]> {
  const res = await http.get<components["schemas"]["IndexTargetList"]>("/fdp-api/index/targets");
  return res.data.targets ?? [];
}

export async function addIndexTarget(input: IndexTargetCreateRequest): Promise<IndexTargetInfo> {
  const res = await http.post<IndexTargetInfo>("/fdp-api/index/targets", input);
  return res.data;
}

export async function removeIndexTarget(id: string): Promise<void> {
  await http.delete(`/fdp-api/index/targets/${encodeURIComponent(id)}`);
}

/** Announce to every effective target now; per-target results. */
export async function pingIndexes(): Promise<PingResultView[]> {
  const res = await http.post<components["schemas"]["IndexPingRunView"]>("/fdp-api/index/ping");
  return res.data.results ?? [];
}
