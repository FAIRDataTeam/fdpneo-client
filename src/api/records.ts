/**
 * Write layer over the FDP LDP endpoints.
 *
 * A record's path id is its URL (`dataset/ad-cohort-2024` → `/dataset/…`); the
 * repository root is the empty path (`/`). Reads return an `ETag`; the server
 * requires `If-Match` on `PUT`/`DELETE` of an existing resource, so callers
 * read first, edit, then write back the captured ETag. A stale ETag yields
 * `412` (surface as a conflict).
 *
 * RDF is sent/received as Turtle. We read raw text (not Axios's JSON parsing)
 * and normalise error envelopes — see `runSparqlQuery` for the same pattern.
 */

import { AxiosError } from "axios";
import { http } from "./http";

export interface GraphWithEtag {
  turtle: string;
  etag: string | null;
}

function readEtag(headers: unknown): string | null {
  if (headers && typeof headers === "object") {
    const value = (headers as Record<string, unknown>)["etag"];
    if (typeof value === "string") return value;
  }
  return null;
}

function normaliseError(err: unknown): never {
  // Error bodies arrive as a JSON string (responseType: text); parse so the
  // envelope-aware `parseFdpError` can read `code`/`message`.
  if (err instanceof AxiosError && typeof err.response?.data === "string") {
    try {
      err.response.data = JSON.parse(err.response.data);
    } catch {
      /* leave raw text */
    }
  }
  throw err;
}

/** Read a resource graph as Turtle, capturing its ETag. */
export async function readGraph(path: string): Promise<GraphWithEtag> {
  try {
    const res = await http.get<string>(`/${path}`, {
      headers: { Accept: "text/turtle" },
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    return { turtle: res.data, etag: readEtag(res.headers) };
  } catch (err) {
    return normaliseError(err);
  }
}

/**
 * Replace a resource graph (`PUT`). Sends `If-Match` when an ETag is supplied
 * (required by the server for existing resources). Returns the new ETag.
 */
export async function putGraph(
  path: string,
  turtle: string,
  etag: string | null,
): Promise<string | null> {
  const headers: Record<string, string> = { "Content-Type": "text/turtle" };
  if (etag) headers["If-Match"] = etag;
  try {
    const res = await http.put(`/${path}`, turtle, { headers, responseType: "text" });
    return readEtag(res.headers);
  } catch (err) {
    return normaliseError(err);
  }
}

/**
 * Best-effort check used for a friendly "id already taken" message before
 * create. Not a safety mechanism — the server rejects a create `PUT` (no
 * `If-Match`) onto an existing resource with `428`, so clobbering can't happen
 * even if this returns a false negative.
 */
export async function recordExists(path: string): Promise<boolean> {
  try {
    await http.get(`/${path}`, {
      headers: { Accept: "text/turtle" },
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    return true;
  } catch {
    return false;
  }
}

/** Delete a resource (`DELETE`), guarded by `If-Match` when an ETag is given. */
export async function deleteGraph(path: string, etag: string | null): Promise<void> {
  const headers: Record<string, string> = {};
  if (etag) headers["If-Match"] = etag;
  try {
    await http.delete(`/${path}`, { headers });
  } catch (err) {
    normaliseError(err);
  }
}
