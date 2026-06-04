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
import type { components } from "./schema";

export type SearchRequest = components["schemas"]["SearchRequest"];
export type SearchResponse = components["schemas"]["SearchResponse"];
export type SearchItem = components["schemas"]["SearchItem"];
export type FacetDimension = components["schemas"]["FacetDimension"];

export async function runSearch(req: SearchRequest): Promise<SearchResponse> {
  const res = await http.post<SearchResponse>("/search", req);
  return res.data;
}
