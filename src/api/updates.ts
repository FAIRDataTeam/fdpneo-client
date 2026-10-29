/**
 * Update notifications client (server ADR-0028, `/fdp-api/admin/updates`).
 *
 * The server checks GitHub for new server and client releases once a day and
 * caches the outcome; admins read it here. The server reports the server
 * releases newer than itself; for the client it returns every known release
 * and the client compares them with its own build version (`__APP_VERSION__`).
 *
 * Types come from the server's OpenAPI schema (`ReleaseView`, `UpdatesView`).
 */

import { http } from "./http";
import type { components } from "./schema";

export type ReleaseInfo = components["schemas"]["ReleaseView"];
export type UpdatesView = components["schemas"]["UpdatesView"];

export async function fetchUpdates(): Promise<UpdatesView> {
  const res = await http.get<UpdatesView>("/fdp-api/admin/updates");
  return res.data;
}

/** Check GitHub now (the server allows this at most once a minute). */
export async function checkUpdatesNow(): Promise<UpdatesView> {
  const res = await http.post<UpdatesView>("/fdp-api/admin/updates/check");
  return res.data;
}

// --- version helpers (mirror the server's parse_version / satisfies) --------

type Version = [number, number, number];

export function parseVersion(value: string | null | undefined): Version | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec((value ?? "").trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Whether `version` meets `>=X.Y.Z` / `==X.Y.Z` / `X.Y.Z`; null when unknown. */
export function satisfies(version: string, requirement: string | null): boolean | null {
  if (!requirement) return true;
  const match = /^\s*(>=|==)?\s*v?(\d+\.\d+\.\d+)\s*$/.exec(requirement);
  const have = parseVersion(version);
  const need = match ? parseVersion(match[2]) : null;
  if (!have || !need) return null;
  const cmp = compareVersions(have, need);
  return match?.[1] === "==" ? cmp === 0 : cmp >= 0;
}

/** Releases strictly newer than `current`, newest first. Unknown current → none. */
export function newerThan(releases: ReleaseInfo[], current: string): ReleaseInfo[] {
  const have = parseVersion(current);
  if (!have) return [];
  return releases.filter((r) => {
    const v = parseVersion(r.version);
    return v !== null && compareVersions(v, have) > 0;
  });
}

// --- notices -----------------------------------------------------------------

export type Component = "server" | "client";

export interface UpdateNotice {
  component: Component;
  current: string;
  latest: ReleaseInfo;
  /** Any release between current and latest is a security release. */
  security: boolean;
  /** Any release between current and latest needs manual upgrade steps. */
  manualSteps: boolean;
  /** No release in the range carries upgrade metadata. */
  metadataMissing: boolean;
  /** Client only: the latest client needs a newer server than the running one. */
  needsServer: string | null;
}

function notice(
  component: Component,
  current: string,
  newer: ReleaseInfo[],
  serverVersion: string,
): UpdateNotice | null {
  const latest = newer[0];
  if (!latest) return null;
  const needs =
    component === "client" && satisfies(serverVersion, latest.requires_server ?? null) === false
      ? (latest.requires_server ?? null)
      : null;
  return {
    component,
    current,
    latest,
    security: newer.some((r) => r.security === true),
    manualSteps: newer.some((r) => r.manual_steps === true),
    metadataMissing: newer.every((r) => !r.metadata_present),
    needsServer: needs,
  };
}

/** What, if anything, the admin should be told about this deployment. */
export function updateNotices(view: UpdatesView, clientVersion: string): UpdateNotice[] {
  return [
    notice("server", view.server_version, view.server_releases, view.server_version),
    notice(
      "client",
      clientVersion,
      newerThan(view.client_releases, clientVersion),
      view.server_version,
    ),
  ].filter((n): n is UpdateNotice => n !== null);
}
