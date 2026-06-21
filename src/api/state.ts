/**
 * Publication state — `POST /{record}/state` + reading current state from the
 * record's meta graph (TASKS 10.3, server ADR-0010).
 *
 * The state machine (server `metadata/states.py`):
 *   DRAFT → PUBLISHED         (owner-or-admin)
 *   PUBLISHED → DRAFT         (unpublish; owner-or-admin)
 *   PUBLISHED → ARCHIVED      (owner-or-admin)
 *   ARCHIVED → DRAFT          (admin-only)
 * Anything else → 409 `fdp.conflict`. `allowedTransitions` mirrors this so the
 * UI only offers legal moves; the server remains the source of truth.
 *
 * Current state isn't in the record graph — it lives in `<record>/meta` as
 * `fdp:metadataState` — so `fetchRecordState` reads that. `record path` is the
 * path id (`catalog/cohort`), or `""` for the repository root.
 */

import { normaliseError } from "./errors";
import { http } from "./http";
import { anyObject, parseTurtle } from "./rdf";
import type { components } from "./schema";

export type MetadataState = components["schemas"]["MetadataState"];
export type StateTransitionResponse = components["schemas"]["StateTransitionResponse"];

const FDP_METADATA_STATE = "https://w3id.org/fdp/o#metadataState";

export interface Transition {
  to: MetadataState;
  /** Verb shown on the control. */
  label: string;
}

/** Legal transitions from `current` for this caller (owner-or-admin; admin gates ARCHIVED→DRAFT). */
export function allowedTransitions(current: MetadataState, isAdmin: boolean): Transition[] {
  switch (current) {
    case "DRAFT":
      return [{ to: "PUBLISHED", label: "Publish" }];
    case "PUBLISHED":
      return [
        { to: "DRAFT", label: "Unpublish" },
        { to: "ARCHIVED", label: "Archive" },
      ];
    case "ARCHIVED":
      return isAdmin ? [{ to: "DRAFT", label: "Restore to draft" }] : [];
    default:
      return [];
  }
}

/** Transition a record to `to`. Throws the server envelope (409/403/404) on failure. */
export async function transitionState(
  recordPath: string,
  to: MetadataState,
): Promise<StateTransitionResponse> {
  const url = recordPath ? `/fdp-api/${recordPath}/state` : `/fdp-api/state`;
  try {
    const res = await http.post<StateTransitionResponse>(url, { to });
    return res.data;
  } catch (err) {
    return normaliseError(err);
  }
}

/** Read a record's current publication state from its meta graph, or null if unavailable. */
export async function fetchRecordState(recordPath: string): Promise<MetadataState | null> {
  const url = recordPath ? `/${recordPath}/meta` : `/meta`;
  try {
    const res = await http.get<string>(url, {
      headers: { Accept: "text/turtle" },
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    const value = anyObject(parseTurtle(res.data), FDP_METADATA_STATE);
    return value === "DRAFT" || value === "PUBLISHED" || value === "ARCHIVED" ? value : null;
  } catch {
    // Meta not readable (anonymous on a non-public record, etc.) — no badge.
    return null;
  }
}
