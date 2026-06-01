/**
 * Schema admin client (server Phase 10.1, `/schemas`).
 *
 * SHACL shapes are managed at runtime: list/read are public; create-replace
 * (`PUT`) and delete are admin-only; `validate` dry-runs a sample record
 * against a *saved* shape. Pairs with `useSchemas` (list cache) and feeds the
 * resource-definition admin "schema" picker so the two-step authoring flow
 * (publish shape → register type) is guided.
 *
 * RDF (shape Turtle, sample records) is sent/received as text; JSON envelopes
 * for the list and validation report. Server response keys are snake_case
 * (no aliases); we map them to camelCase here.
 */

import { AxiosError } from "axios";
import { http } from "./http";

export interface SchemaSummary {
  id: string;
  iri: string;
  targetClass: string | null;
  version: number | null;
}

export interface SchemaViolation {
  focusNode: string | null;
  resultPath: string | null;
  message: string | null;
  value: string | null;
}

export interface SchemaValidation {
  conforms: boolean;
  violations: SchemaViolation[];
}

interface RawSummary {
  id?: string;
  iri?: string;
  target_class?: string | null;
  version?: number | null;
}

interface RawViolation {
  focus_node?: string | null;
  result_path?: string | null;
  message?: string | null;
  value?: string | null;
}

function toSummary(raw: RawSummary): SchemaSummary {
  return {
    id: raw.id ?? "",
    iri: raw.iri ?? "",
    targetClass: raw.target_class ?? null,
    version: raw.version ?? null,
  };
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

/** List published shapes (public). */
export async function listSchemas(): Promise<SchemaSummary[]> {
  const res = await http.get<{ schemas?: RawSummary[] }>("/schemas");
  return (res.data.schemas ?? []).map(toSummary);
}

/** Fetch a shape's Turtle (public). */
export async function getSchemaTurtle(id: string): Promise<string> {
  try {
    const res = await http.get<string>(`/schemas/${encodeURIComponent(id)}`, {
      headers: { Accept: "text/turtle" },
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    return res.data;
  } catch (err) {
    return normaliseError(err);
  }
}

/** Create or replace a shape (admin). Body is Turtle. */
export async function putSchema(id: string, turtle: string): Promise<SchemaSummary> {
  try {
    const res = await http.put<RawSummary>(`/schemas/${encodeURIComponent(id)}`, turtle, {
      headers: { "Content-Type": "text/turtle" },
      transformRequest: (d: unknown) => d,
    });
    return toSummary(res.data);
  } catch (err) {
    return normaliseError(err);
  }
}

/** Delete a shape (admin). 409 if a resource definition still references it. */
export async function deleteSchema(id: string): Promise<void> {
  try {
    await http.delete(`/schemas/${encodeURIComponent(id)}`);
  } catch (err) {
    normaliseError(err);
  }
}

/** Dry-run a sample record (Turtle) against a saved shape (authenticated). */
export async function validateSample(id: string, sampleTurtle: string): Promise<SchemaValidation> {
  try {
    const res = await http.post<{ conforms?: boolean; violations?: RawViolation[] }>(
      `/schemas/${encodeURIComponent(id)}/validate`,
      sampleTurtle,
      { headers: { "Content-Type": "text/turtle" }, transformRequest: (d: unknown) => d },
    );
    return {
      conforms: Boolean(res.data.conforms),
      violations: (res.data.violations ?? []).map((v) => ({
        focusNode: v.focus_node ?? null,
        resultPath: v.result_path ?? null,
        message: v.message ?? null,
        value: v.value ?? null,
      })),
    };
  } catch (err) {
    return normaliseError(err);
  }
}
