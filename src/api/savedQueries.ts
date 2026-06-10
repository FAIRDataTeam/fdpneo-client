/**
 * Saved search queries — `GET|POST /me/saved-queries`,
 * `PUT|DELETE /me/saved-queries/{id}` (TASKS 10.2).
 *
 * A saved query stores an opaque `query` object (we put the search text +
 * facet selection in it) under a name. The list includes the caller's own
 * queries plus any `shared` ones (`mine` flags ownership); admins can toggle
 * `shared`. All endpoints require auth.
 */

import { http } from "./http";
import type { components } from "./schema";

export type SavedQueryView = components["schemas"]["SavedQueryView"];
export type SavedQueryCreate = components["schemas"]["SavedQueryCreate"];
export type SavedQueryUpdate = components["schemas"]["SavedQueryUpdate"];

export async function listSavedQueries(): Promise<SavedQueryView[]> {
  const res = await http.get<components["schemas"]["SavedQueryList"]>("/fdp-api/me/saved-queries");
  return res.data.queries ?? [];
}

export async function createSavedQuery(input: SavedQueryCreate): Promise<SavedQueryView> {
  const res = await http.post<SavedQueryView>("/fdp-api/me/saved-queries", input);
  return res.data;
}

export async function updateSavedQuery(id: string, patch: SavedQueryUpdate): Promise<SavedQueryView> {
  const res = await http.put<SavedQueryView>(`/fdp-api/me/saved-queries/${encodeURIComponent(id)}`, patch);
  return res.data;
}

export async function deleteSavedQuery(id: string): Promise<void> {
  await http.delete(`/fdp-api/me/saved-queries/${encodeURIComponent(id)}`);
}
