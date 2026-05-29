/**
 * `useTree` — the repository → catalogs → datasets hierarchy for the
 * container browser.
 *
 * Built from SPARQL: the root repository's title plus each catalog and the
 * datasets that declare it as their `dct:isPartOf` parent. Node ids are path
 * ids so they double as `/records/:id` targets.
 */

import { useQuery } from "@tanstack/vue-query";
import { queryKeys } from "@/api/queries";
import { apiBase, iriToId, NS } from "@/api/rdf";
import { sparqlSelect, value } from "@/api/sparql";
import type { TreeNode } from "@/data/sampleRecord";

const HIERARCHY_QUERY = `SELECT ?c ?ctitle ?d ?dtitle WHERE {
  GRAPH ?c { ?c a <${NS.dcat}Catalog> ; <${NS.dct}title> ?ctitle }
  OPTIONAL {
    GRAPH ?d { ?d a <${NS.dcat}Dataset> ; <${NS.dct}isPartOf> ?c ; <${NS.dct}title> ?dtitle }
  }
} ORDER BY ?ctitle ?dtitle`;

async function fetchRootTitle(): Promise<string> {
  const base = apiBase();
  const rows = await sparqlSelect(
    `SELECT ?title WHERE { GRAPH <${base}> { <${base}> <${NS.dct}title> ?title } }`,
  );
  return value(rows[0] ?? {}, "title") ?? "Repository";
}

async function fetchTree(): Promise<TreeNode> {
  const [rootTitle, rows] = await Promise.all([fetchRootTitle(), sparqlSelect(HIERARCHY_QUERY)]);

  const catalogs = new Map<string, TreeNode>();
  for (const row of rows) {
    const cIri = value(row, "c");
    if (!cIri) continue;
    let cat = catalogs.get(cIri);
    if (!cat) {
      cat = {
        id: iriToId(cIri),
        label: value(row, "ctitle") ?? iriToId(cIri),
        count: 0,
        children: [],
      };
      catalogs.set(cIri, cat);
    }
    const dIri = value(row, "d");
    if (dIri) {
      cat.children!.push({ id: iriToId(dIri), label: value(row, "dtitle") ?? iriToId(dIri) });
      cat.count = (cat.count ?? 0) + 1;
    }
  }

  const children = [...catalogs.values()];
  return {
    id: iriToId(apiBase()),
    label: rootTitle,
    count: children.reduce((sum, c) => sum + (c.count ?? 0), 0),
    children,
  };
}

export function useTree() {
  return useQuery({
    queryKey: queryKeys.tree(),
    queryFn: fetchTree,
    staleTime: 5 * 60_000,
  });
}
