/**
 * Admin backup/restore client (server ADR-0016 §5 amendment, FDPneo v0.9.0).
 *
 * Job-based, `admin`-role-gated endpoints under `/fdp-api/admin/backup`: start a
 * dump or restore (→ 202 + a job), poll the job, then download a finished dump's
 * archive. The HTTP layer is only a role-gated trigger for the same code paths as
 * the `fdp backup …` CLI. Errors surface through the standard FDP envelope
 * (`parseFdpError`) — callers branch on `.status` (403 / 404 / 409 / 413).
 *
 * The `result` payloads are typed as `dict[str, Any]` server-side (no OpenAPI
 * schema), so `DumpResult` / `RestoreResult` are defined here to match the
 * documented shapes; the `BackupJob` envelope mirrors the server `JobView`.
 * `import` (rebase / reference-FDP crawl) is intentionally NOT exposed over HTTP
 * — it stays CLI-only — so there is no client for it here.
 *
 * Full-deployment backups (server ADR-0029): `scope=full` adds the Postgres state
 * (settings, API keys, saved searches, audit trail, metrics history). A full
 * archive carries credentials, so over HTTP it is always encrypted with a
 * passphrase the server never stores; restoring it needs the same passphrase.
 */

import { http } from "./http";

export type BackupJobKind = "dump" | "restore";
export type BackupScope = "store" | "full";

/** Minimum passphrase length the server accepts for an encrypted archive. */
export const MIN_PASSPHRASE_LENGTH = 12;
/** First bytes of an encrypted (sealed) archive. */
const SEALED_MAGIC = "FDPNEO-ENC1";
export type BackupJobState = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

/** `result` of a SUCCEEDED dump job. */
export interface DumpResult {
  graphs: number;
  quads: number;
  audit_rows: number;
  data_model_version: string;
  /** archive file name inside the dump (the download endpoint serves it). */
  archive: string;
  /** `full` for a full-deployment backup (servers ≥ 0.20). */
  scope?: BackupScope;
  /** Rows per Postgres state table (full backups only). */
  state_rows?: Record<string, number>;
  /** True when the archive is passphrase-encrypted (`.fdpbk`). */
  encrypted?: boolean;
}

/** `result` of a SUCCEEDED restore job. */
export interface RestoreResult {
  graphs_loaded: number;
  graphs_skipped: number;
  quads: number;
  dry_run: boolean;
  migrated: boolean;
  profiles_provisioned: number;
  audit_rows: number;
  records_indexed: number;
  scope?: BackupScope;
  /** Rows loaded per Postgres state table (full archives only). */
  state_rows?: Record<string, number>;
}

/** A backup/restore job, exactly as polled from the server. */
export interface BackupJob {
  id: string;
  kind: BackupJobKind;
  state: BackupJobState;
  created_at: string;
  finished_at: string | null;
  result: DumpResult | RestoreResult | null;
  error: string | null;
}

export interface RestoreOptions {
  merge: boolean;
  overwrite: boolean;
  noAudit: boolean;
  dryRun: boolean;
}

const BASE = "/fdp-api/admin/backup";

/** True once a job has reached a terminal state (stop polling). */
export function isJobDone(state: BackupJobState): boolean {
  return state === "SUCCEEDED" || state === "FAILED";
}

/** Narrow a job's result to a dump result (present on dump jobs). */
export function isDumpResult(job: BackupJob): job is BackupJob & { result: DumpResult } {
  return job.kind === "dump" && job.result !== null && "archive" in job.result;
}

/** Narrow a job's result to a restore result. */
export function isRestoreResult(job: BackupJob): job is BackupJob & { result: RestoreResult } {
  return job.kind === "restore" && job.result !== null && "graphs_loaded" in job.result;
}

/** Start a store dump (admin) → 202 + a `dump` job to poll.
 *  With `full`, a full-deployment backup sealed with `full.passphrase`
 *  (400 without one, 422 if it is too short). */
export async function startDump(
  noAudit: boolean,
  full?: { passphrase: string },
): Promise<BackupJob> {
  const res = full
    ? await http.post<BackupJob>(
        `${BASE}/dump`,
        { passphrase: full.passphrase },
        { params: { no_audit: noAudit, scope: "full" } },
      )
    : await http.post<BackupJob>(`${BASE}/dump`, null, { params: { no_audit: noAudit } });
  return res.data;
}

/** True when `file` is an encrypted (sealed) archive that needs a passphrase. */
export async function isSealedArchive(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, SEALED_MAGIC.length).arrayBuffer());
  return new TextDecoder().decode(head) === SEALED_MAGIC;
}

/** Start a restore from an uploaded archive (admin) → 202 + a `restore` job.
 *  400 if `merge` and `overwrite` are both set; 413 if the upload exceeds the
 *  server body limit. */
export async function startRestore(
  archive: File,
  opts: RestoreOptions,
  passphrase?: string,
): Promise<BackupJob> {
  const form = new FormData();
  form.append("archive", archive);
  if (passphrase) form.append("passphrase", passphrase);
  const res = await http.post<BackupJob>(`${BASE}/restore`, form, {
    params: { merge: opts.merge, overwrite: opts.overwrite, no_audit: opts.noAudit, dry_run: opts.dryRun },
  });
  return res.data;
}

/** Poll one job's status. 404 if unknown. */
export async function getBackupJob(id: string): Promise<BackupJob> {
  const res = await http.get<BackupJob>(`${BASE}/jobs/${encodeURIComponent(id)}`);
  return res.data;
}

/** Download a finished dump job's archive as a Blob. 409 if not ready; 404 if
 *  not a dump job. */
export async function downloadArchive(id: string): Promise<Blob> {
  const res = await http.get<Blob>(`${BASE}/jobs/${encodeURIComponent(id)}/archive`, {
    responseType: "blob",
  });
  return res.data;
}
