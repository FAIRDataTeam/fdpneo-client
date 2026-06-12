/**
 * Class-instance + subclass lookup — backs the DASH reference editors
 * (dash:AutoCompleteEditor / dash:InstancesSelectEditor / dash:SubClassEditor).
 *
 * `GET /fdp-api/instances?class=&q=&limit=&offset=` lists instances of a class
 * (label-filtered by `q`); `GET /fdp-api/subclasses?class=` lists its subclasses.
 * Both are state/auth-gated server-side, so the caller only sees what they may.
 */

import { http } from "./http";
import type { components } from "./schema";

type InstanceListView = components["schemas"]["InstanceListView"];
type SubclassListView = components["schemas"]["SubclassListView"];

/** A pickable reference: an IRI plus a human label. */
export interface RefItem {
  iri: string;
  label: string;
}

/** Instances of `classIri`, optionally filtered by label substring `q`. */
export async function fetchInstances(classIri: string, q = "", limit = 50): Promise<RefItem[]> {
  const params = new URLSearchParams({ class: classIri, limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  const res = await http.get<InstanceListView>(`/fdp-api/instances?${params.toString()}`);
  return (res.data.items ?? []).map((i) => ({ iri: i.iri, label: i.label }));
}

/** Subclasses of `classIri` (transitive), each as {iri, label}. */
export async function fetchSubclasses(classIri: string): Promise<RefItem[]> {
  const res = await http.get<SubclassListView>(
    `/fdp-api/subclasses?class=${encodeURIComponent(classIri)}`,
  );
  return (res.data.items ?? []).map((i) => ({ iri: i.iri, label: i.label }));
}
