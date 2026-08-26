/**
 * `useTreeGraph` — the browse container tree (repository → containers →
 * members), built from one SPARQL query over `dct:isPartOf`.
 *
 * Why SPARQL and not the LDP `/page` read-extension `useTree` uses: `/page` is
 * policy-gated and returns nothing for anonymous visitors, so the persistent
 * browse tree would stop at the top level. SPARQL is the same public path
 * `useCatalogs`/`useChildRecords` already rely on, so the tree populates for
 * everyone.
 *
 * Which rdf:types count as tree nodes is *not* hardcoded: the set is derived
 * from the deployment's resource-type catalog (`useResourceTypes`, ADR-0009),
 * walking from the root definition through its declared children. Admins can
 * add, remove or re-parent types at runtime and the tree follows. Deep leaf
 * artifacts (a childless type nested below the top-level containers — e.g.
 * `dcat:Distribution` in a stock DCAT deployment) are excluded: they are shown
 * on their parent's record page, not as container-tree nodes. Until the catalog
 * loads (or when the endpoint is down) the static DCAT specs supply the same
 * walk, so stock deployments keep working.
 *
 * Only IRI subjects are selected: the root record advertises its SPARQL/search
 * endpoints as *blank-node* `dcat:DataService` descriptors (server ADR-0018
 * G-05), which are service metadata, not browsable records.
 *
 * The whole forest loads in one round-trip (record counts are small) and
 * `TreeNode` collapses each level by default, so expanding a node is instant.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { queryKeys } from "@/api/queries";
import { apiBase, iriToId, NS, shortLabel } from "@/api/rdf";
import { sparqlSelect, value, type SparqlBinding } from "@/api/sparql";
import { ENTITY_SPECS, type EntitySpec, type EntityType } from "@/api/entityForms";
import { useResourceTypes } from "@/composables/useResourceTypes";
import type { TreeNode } from "@/data/sampleRecord";

/** Depth (below the root) at or above which childless types are still tree nodes. */
const LEAF_MAX_DEPTH = 1;

/**
 * Collect the rdf:type IRIs that make up the browse tree, walking the type
 * hierarchy breadth-first from `topTypes` (the root definition's children).
 * A type is kept when it has children of its own, or when it sits at depth
 * ≤ `LEAF_MAX_DEPTH` (a member directly under a top-level container). Cycles
 * and duplicates are tolerated. Pure, so the walk is unit-testable.
 */
export function treeClassIris(
  topTypes: EntityType[],
  specFor: (type: EntityType) => EntitySpec | null,
): string[] {
  const out = new Set<string>();
  const seen = new Set<EntityType>();
  let frontier = topTypes.filter((t) => !!t);
  let depth = 0;
  while (frontier.length) {
    const next: EntityType[] = [];
    for (const type of frontier) {
      if (seen.has(type)) continue;
      seen.add(type);
      const spec = specFor(type);
      if (!spec) continue;
      const hasChildren = spec.childTypes.length > 0;
      if (hasChildren || depth <= LEAF_MAX_DEPTH) out.add(spec.classIri);
      if (hasChildren) next.push(...spec.childTypes);
    }
    frontier = next;
    depth += 1;
  }
  return [...out];
}

/** The SPARQL that selects every IRI-identified instance of `classIris` with its title and parent. */
export function treeQuery(classIris: string[]): string {
  const values = classIris.map((c) => `<${c}>`).join(" ");
  return `SELECT DISTINCT ?s ?title ?parent WHERE {
  VALUES ?type { ${values} }
  GRAPH ?g {
    ?s a ?type .
    FILTER(isIRI(?s))
    OPTIONAL { ?s <${NS.dct}title> ?title }
    OPTIONAL { ?s <${NS.dct}isPartOf> ?parent }
  }
} ORDER BY ?title`;
}

/** Static DCAT fallback: the catalog's own root children when no definitions are loaded. */
const STATIC_TOP: EntityType[] = ["catalog"];

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
  const { defs, specFor } = useResourceTypes();

  const classIris = computed<string[]>(() => {
    const root = defs.value.find((d) => d.isRoot);
    const top = root?.children.map((c) => c.target).filter(Boolean) ?? [];
    const staticSpecFor = (t: EntityType) => ENTITY_SPECS[t] ?? null;
    return top.length ? treeClassIris(top, specFor) : treeClassIris(STATIC_TOP, staticSpecFor);
  });

  return useQuery({
    queryKey: computed(() => [...queryKeys.tree(), "graph", classIris.value]),
    staleTime: 5 * 60_000,
    enabled: computed(() => classIris.value.length > 0),
    queryFn: async () => buildTreeForest(await sparqlSelect(treeQuery(classIris.value)), apiBase()),
  });
}
