/**
 * `useTreeGraph` — the browse container tree (repository → catalogs → datasets /
 * data-services), built from one SPARQL query over `dct:isPartOf`.
 *
 * Why SPARQL and not the LDP `/page` read-extension `useTree` uses: `/page` is
 * policy-gated and returns nothing for anonymous visitors, so the persistent
 * browse tree would stop at the top level. SPARQL is the same public path
 * `useCatalogs`/`useChildRecords` already rely on, so the tree populates for
 * everyone. Distributions are intentionally excluded — they are leaf artifacts
 * shown on the dataset page, not container-tree nodes (matches the 2a mockup).
 *
 * The whole forest loads in one round-trip (record counts are small) and
 * `TreeNode` collapses each level by default, so expanding a node is instant.
 */

import { useQuery } from "@tanstack/vue-query";
import { queryKeys } from "@/api/queries";
import { apiBase, iriToId, NS, shortLabel } from "@/api/rdf";
import { sparqlSelect, value, type SparqlBinding } from "@/api/sparql";
import type { TreeNode } from "@/data/sampleRecord";

const TREE_QUERY = `SELECT DISTINCT ?s ?title ?parent WHERE {
  GRAPH ?g {
    ?s a ?type .
    FILTER(?type IN (<${NS.dcat}Catalog>, <${NS.dcat}Dataset>, <${NS.dcat}DataService>))
    OPTIONAL { ?s <${NS.dct}title> ?title }
    OPTIONAL { ?s <${NS.dct}isPartOf> ?parent }
  }
} ORDER BY ?title`;

/**
 * Assemble the container forest from `(subject, title, parent)` rows. Pure, so
 * the nesting logic is unit-testable without the query. Nodes whose parent is
 * the repository root (`base`) — or is missing/outside the set — become
 * top-level; everything else nests under its parent. `count` is the child count
 * (omitted when zero, so leaf nodes carry no badge). `base` has no trailing slash.
 */
export function buildTreeForest(rows: SparqlBinding[], base: string): TreeNode[] {
  interface Building extends TreeNode {
    children: TreeNode[];
    _parent: string | undefined;
  }
  const nodes = new Map<string, Building>();
  const order: string[] = [];

  for (const row of rows) {
    const iri = value(row, "s");
    if (!iri || nodes.has(iri)) continue;
    nodes.set(iri, {
      id: iriToId(iri),
      label: value(row, "title") || shortLabel(iri),
      children: [],
      _parent: value(row, "parent"),
    });
    order.push(iri);
  }

  const roots: Building[] = [];
  for (const iri of order) {
    const node = nodes.get(iri)!;
    const parent = node._parent;
    const parentNode = parent && parent !== base ? nodes.get(parent) : undefined;
    if (parentNode) parentNode.children.push(node);
    else roots.push(node);
  }

  // Strip the build-only field and drop empty child arrays / zero counts.
  const finalize = (n: Building): TreeNode => {
    const children = n.children.map((c) => finalize(c as Building));
    const out: TreeNode = { id: n.id, label: n.label };
    if (children.length) {
      out.children = children;
      out.count = children.length;
    }
    return out;
  };
  return roots.map(finalize);
}

/** Top-level container nodes (nested) for the browse tree; empty on failure. */
export function useTreeGraph() {
  return useQuery({
    queryKey: [...queryKeys.tree(), "graph"],
    staleTime: 5 * 60_000,
    queryFn: async () => buildTreeForest(await sparqlSelect(TREE_QUERY), apiBase()),
  });
}
