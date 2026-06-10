/**
 * Policy admin client (server ADR-0012 / Phase 14.2, `/fdp-api/policies`).
 *
 * First-class ODRL Offers, managed exactly like SHACL schemas: list/read are
 * public; create-replace (`PUT`) and delete are admin-only; `validate` dry-runs
 * a candidate Offer body against the FDP ODRL profile. Pairs with `usePolicies`
 * (list cache) and the ODRL composer. RDF is sent/received as text; JSON
 * envelopes for the list and validation report.
 */

import { AxiosError } from "axios";
import { http } from "./http";

export interface PolicySummary {
  id: string;
  iri: string;
  title: string | null;
  assigner: string | null;
  permissions: number;
  prohibitions: number;
  state: string | null;
  version: number | null;
}

export interface PolicyViolation {
  message: string | null;
  /** profile-violation context (offer/rule/constraint/operator…), flattened */
  detail: string | null;
}

export interface PolicyValidation {
  conforms: boolean;
  violations: PolicyViolation[];
}

interface RawPolicy {
  id?: string;
  iri?: string;
  title?: string | null;
  assigner?: string | null;
  permissions?: number;
  prohibitions?: number;
  state?: string | null;
  version?: number | null;
}

function toSummary(raw: RawPolicy): PolicySummary {
  return {
    id: raw.id ?? "",
    iri: raw.iri ?? "",
    title: raw.title ?? null,
    assigner: raw.assigner ?? null,
    permissions: raw.permissions ?? 0,
    prohibitions: raw.prohibitions ?? 0,
    state: raw.state ?? null,
    version: raw.version ?? null,
  };
}

function toViolation(raw: Record<string, string | null>): PolicyViolation {
  const detail = Object.entries(raw)
    .filter(([k, v]) => k !== "message" && v != null)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return { message: raw.message ?? null, detail: detail || null };
}

/** Error bodies arrive as a JSON string (responseType: text); parse so the
 * envelope-aware `parseFdpError` can read `code`/`message`. */
function normaliseError(err: unknown): never {
  if (err instanceof AxiosError && typeof err.response?.data === "string") {
    try {
      err.response.data = JSON.parse(err.response.data);
    } catch {
      /* leave raw text */
    }
  }
  throw err;
}

/**
 * List managed policies. Default returns all (incl. drafts) for the manager;
 * `publishedOnly` (`?published=true`) is the set offered for *assignment* via
 * `dct:rights` (ADR-0012 §4 — only PUBLISHED is discoverable/assignable).
 */
export async function listPolicies(publishedOnly = false): Promise<PolicySummary[]> {
  const res = await http.get<{ policies?: RawPolicy[] }>(
    "/fdp-api/policies",
    publishedOnly ? { params: { published: true } } : undefined,
  );
  return (res.data.policies ?? []).map(toSummary);
}

/** Fetch a policy's Offer Turtle (public, dereferenceable). */
export async function getPolicyTurtle(id: string): Promise<string> {
  try {
    const res = await http.get<string>(`/fdp-api/policies/${encodeURIComponent(id)}`, {
      headers: { Accept: "text/turtle" },
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    return res.data;
  } catch (err) {
    return normaliseError(err);
  }
}

/** Create or replace a policy (admin). Body is Turtle; validated server-side. */
export async function putPolicy(id: string, turtle: string): Promise<PolicySummary> {
  try {
    const res = await http.put<RawPolicy>(`/fdp-api/policies/${encodeURIComponent(id)}`, turtle, {
      headers: { "Content-Type": "text/turtle" },
      transformRequest: (d: unknown) => d,
    });
    return toSummary(res.data);
  } catch (err) {
    return normaliseError(err);
  }
}

/** Delete a policy (admin). 409 if a record still references it via dct:rights. */
export async function deletePolicy(id: string): Promise<void> {
  try {
    await http.delete(`/fdp-api/policies/${encodeURIComponent(id)}`);
  } catch (err) {
    normaliseError(err);
  }
}

/** Dry-run a candidate Offer body against the FDP profile (authenticated). */
export async function validatePolicy(id: string, turtle: string): Promise<PolicyValidation> {
  try {
    const res = await http.post<{ conforms?: boolean; violations?: Record<string, string | null>[] }>(
      `/fdp-api/policies/${encodeURIComponent(id)}/validate`,
      turtle,
      { headers: { "Content-Type": "text/turtle" }, transformRequest: (d: unknown) => d },
    );
    return {
      conforms: Boolean(res.data.conforms),
      violations: (res.data.violations ?? []).map(toViolation),
    };
  } catch (err) {
    return normaliseError(err);
  }
}
