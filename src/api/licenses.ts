/**
 * License admin client (server ADR-0012 / Phase 14.3, `/licenses`).
 *
 * Managed, descriptive license documents (referenced via `dct:license`, not
 * PDP-enforced), validated by SHACL against the server license shape. CRUD +
 * dry-run validate, mirroring `policies.ts`/`schemas.ts`.
 */

import { AxiosError } from "axios";
import { http } from "./http";
import type { PolicyValidation } from "./policies";

export interface LicenseSummary {
  id: string;
  iri: string;
  title: string | null;
  state: string | null;
  version: number | null;
}

interface RawLicense {
  id?: string;
  iri?: string;
  title?: string | null;
  state?: string | null;
  version?: number | null;
}

function toSummary(raw: RawLicense): LicenseSummary {
  return {
    id: raw.id ?? "",
    iri: raw.iri ?? "",
    title: raw.title ?? null,
    state: raw.state ?? null,
    version: raw.version ?? null,
  };
}

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
 * List managed licenses. Default returns all (manager); `publishedOnly`
 * (`?published=true`) is the set offered for assignment via `dct:license`.
 */
export async function listLicenses(publishedOnly = false): Promise<LicenseSummary[]> {
  const res = await http.get<{ licenses?: RawLicense[] }>(
    "/licenses",
    publishedOnly ? { params: { published: true } } : undefined,
  );
  return (res.data.licenses ?? []).map(toSummary);
}

/** Fetch a license document's Turtle (public). */
export async function getLicenseTurtle(id: string): Promise<string> {
  try {
    const res = await http.get<string>(`/licenses/${encodeURIComponent(id)}`, {
      headers: { Accept: "text/turtle" },
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    return res.data;
  } catch (err) {
    return normaliseError(err);
  }
}

/** Create or replace a license (admin). Body is Turtle; SHACL-validated server-side. */
export async function putLicense(id: string, turtle: string): Promise<LicenseSummary> {
  try {
    const res = await http.put<RawLicense>(`/licenses/${encodeURIComponent(id)}`, turtle, {
      headers: { "Content-Type": "text/turtle" },
      transformRequest: (d: unknown) => d,
    });
    return toSummary(res.data);
  } catch (err) {
    return normaliseError(err);
  }
}

/** Delete a license (admin). 409 if a record still references it via dct:license. */
export async function deleteLicense(id: string): Promise<void> {
  try {
    await http.delete(`/licenses/${encodeURIComponent(id)}`);
  } catch (err) {
    normaliseError(err);
  }
}

/** Dry-run a candidate license body against the license shape (authenticated). */
export async function validateLicense(id: string, turtle: string): Promise<PolicyValidation> {
  try {
    const res = await http.post<{ conforms?: boolean; violations?: Record<string, string | null>[] }>(
      `/licenses/${encodeURIComponent(id)}/validate`,
      turtle,
      { headers: { "Content-Type": "text/turtle" }, transformRequest: (d: unknown) => d },
    );
    return {
      conforms: Boolean(res.data.conforms),
      violations: (res.data.violations ?? []).map((raw) => ({
        message: raw.message ?? null,
        detail:
          Object.entries(raw)
            .filter(([k, v]) => k !== "message" && v != null)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ") || null,
      })),
    };
  } catch (err) {
    return normaliseError(err);
  }
}
