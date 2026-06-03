/**
 * Stable TanStack Query keys.
 *
 * Centralised so query consumers and mutation invalidators agree on the shape.
 * Keep these in sync with the actual fetchers in `src/composables/use*.ts`.
 */

export type FacetSelection = Record<string, string[]>;

export const queryKeys = {
  record: (id: string) => ["record", id] as const,
  catalogs: () => ["catalogs"] as const,
  tree: () => ["tree"] as const,
  search: (query: string, facets: FacetSelection) => ["search", query, facets] as const,
  stewardRecords: () => ["steward-records"] as const,
  metricsOverview: (range: string) => ["metrics", "overview", range] as const,
  resourceMetrics: (resourceId: string, range: string) =>
    ["metrics", "resource", resourceId, range] as const,
  appInfo: () => ["app-info"] as const,
  readiness: () => ["readiness"] as const,
  labels: (iris: string[]) => ["labels", iris] as const,
  autocomplete: (source: string, prefix: string) =>
    ["autocomplete", source, prefix] as const,
};
