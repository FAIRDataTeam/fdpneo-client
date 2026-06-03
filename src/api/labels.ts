/**
 * Label resolution — `GET /labels?iri=…&iri=…&lang=en`.
 *
 * The server resolves IRIs (licenses, publishers, themes, …) to human text,
 * preferring the requested language and falling back to untagged literals. The
 * client batch-resolves the IRIs on a record/detail page in one call rather
 * than showing raw URLs or the last-IRI-segment hack (`rdf.ts shortLabel`),
 * which stays as the offline fallback (see `useLabels`).
 *
 * `/labels` is public. If it fails (old server, or a downstream outage), the
 * caller falls back to the IRI-derived label.
 */

import { http } from "./http";
import type { components } from "./schema";

export type LabelMap = components["schemas"]["LabelsResponse"]["labels"];

/** Batch-resolve IRIs to labels. Empty/duplicate-only input skips the call. */
export async function fetchLabels(iris: string[], lang = "en"): Promise<LabelMap> {
  const unique = [...new Set(iris.filter((iri) => iri.trim()))];
  if (!unique.length) return {};
  const params = new URLSearchParams();
  for (const iri of unique) params.append("iri", iri);
  params.set("lang", lang);
  const res = await http.get<components["schemas"]["LabelsResponse"]>(`/labels?${params.toString()}`);
  return res.data.labels ?? {};
}
