/**
 * Faceted search — `POST /search` (TASKS 10.2).
 *
 * Replaces the client-side SPARQL search with the server's index: full-text +
 * type/license/date facets, paginated, and policy- **and** publication-state
 * gated server-side (anonymous sees only published). Facet *dimensions* and
 * their value buckets come back in the response, so the UI renders them from
 * the server rather than hardcoding a list.
 */

import { http } from "./http";
import type { FacetSelection } from "./queries";
import type { components } from "./schema";

export type SearchRequest = components["schemas"]["SearchRequest"];
export type SearchResponse = components["schemas"]["SearchResponse"];
export type SearchItem = components["schemas"]["SearchItem"];
export type FacetDimension = components["schemas"]["FacetDimension"];

export async function runSearch(req: SearchRequest): Promise<SearchResponse> {
  const res = await http.post<SearchResponse>("/fdp-api/search", req);
  return res.data;
}

/**
 * The search request for a text + facet selection — the one shape both the
 * live search and saved searches use (the server validates saved searches
 * against `SearchRequest`). The `type` facet maps to `types`, `license` to the
 * single `license` filter; other facet groups are display-only.
 */
export function toSearchRequest(
  text: string,
  facets: FacetSelection,
): Pick<SearchRequest, "query" | "types" | "license"> {
  return {
    query: text.trim() || null,
    types: facets.type ?? [],
    license: facets.license?.[0] ?? null,
  };
}

/**
 * The text + facet selection a stored search request stands for. Also reads
 * the `{ q, facets }` shape that client 0.9.2 and earlier tried to save.
 */
export function fromSearchRequest(stored: Record<string, unknown>): {
  text: string;
  facets: FacetSelection;
} {
  if (typeof stored.q === "string" || (stored.facets && typeof stored.facets === "object")) {
    return {
      text: typeof stored.q === "string" ? stored.q : "",
      facets: (stored.facets as FacetSelection | undefined) ?? {},
    };
  }
  const facets: FacetSelection = {};
  const types = Array.isArray(stored.types)
    ? stored.types.filter((t): t is string => typeof t === "string")
    : [];
  if (types.length) facets.type = types;
  if (typeof stored.license === "string" && stored.license) facets.license = [stored.license];
  return { text: typeof stored.query === "string" ? stored.query : "", facets };
}
