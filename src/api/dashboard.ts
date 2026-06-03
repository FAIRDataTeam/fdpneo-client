/**
 * Steward dashboard — `GET /me/dashboard` (TASKS 10.2).
 *
 * Returns the records the signed-in user owns, can edit, and recently touched,
 * each as a light summary (`record_iri`, `type_iri`, `title`, `last_modified`).
 * This replaces the SPARQL enumeration in `useStewardRecords` with the server's
 * real ownership/visibility view (policy- and state-gated server-side).
 *
 * Note: the current contract carries no publication-`state` field, so the
 * dashboard's long-promised status column still waits on 10.3 — we don't
 * invent it here.
 */

import { http } from "./http";
import type { components } from "./schema";

export type DashboardResponse = components["schemas"]["DashboardResponse"];
export type DashboardItem = components["schemas"]["DashboardItem"];

/** Fetch the signed-in user's dashboard. Requires auth (401 anonymous). */
export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await http.get<DashboardResponse>("/me/dashboard");
  return res.data;
}
