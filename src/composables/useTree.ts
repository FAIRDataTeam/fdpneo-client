/**
 * `useTree` — the repository → containers → members hierarchy for the
 * container browser.
 *
 * Built from the LDP read-extension `GET …/page/{childPrefix}` (TASKS 10.9),
 * not SPARQL: the root's child types come from the live type catalog
 * (`useResourceTypes`), each container's members from *its* child types. This
 * removes the named-graph-name coupling the old `GRAPH ?g` query had and
 * respects publication state server-side (drafts drop out of the page). Falls
 * back to plain DCAT (Catalog → Dataset/DataService) when the catalog is empty.
 *
 * Eager two levels (containers + their members) to match the existing
 * `TreeNode` shape the browser renders; each `/page` call is policy-gated and a
 * failing branch degrades to empty rather than failing the whole tree.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { queryKeys } from "@/api/queries";
import { apiBase, iriToId, NS, one, parseTurtle } from "@/api/rdf";
import { fetchChildrenPage } from "@/api/extensions";
import { readGraph } from "@/api/records";
import { useResourceTypes } from "@/composables/useResourceTypes";
import type { EntityType } from "@/api/entityForms";
import type { TreeNode } from "@/data/sampleRecord";

const DCAT_TOP = ["catalog"];
const PAGE_LIMIT = 200;

async function fetchRootTitle(): Promise<string> {
  try {
    const { turtle } = await readGraph("");
    const store = parseTurtle(turtle);
    const base = apiBase();
    return (
      one(store, base, `${NS.dct}title`) ??
      one(store, `${base}/`, `${NS.dct}title`) ??
      "Repository"
    );
  } catch {
    return "Repository";
  }
}

/** Children of one type under a parent (`""` = root); empty on a gated/failed page. */
async function childrenOf(parentId: string, childPrefix: string): Promise<TreeNode[]> {
  try {
    const page = await fetchChildrenPage(parentId, childPrefix, { limit: PAGE_LIMIT });
    return page.children.map((c) => ({ id: c.id, label: c.label }));
  } catch {
    return [];
  }
}

async function fetchTree(
  topPrefixes: string[],
  childPrefixesOf: (type: EntityType) => EntityType[],
): Promise<TreeNode> {
  const [rootTitle, containerLists] = await Promise.all([
    fetchRootTitle(),
    Promise.all(topPrefixes.map((p) => childrenOf("", p))),
  ]);
  const containers = containerLists.flat();

  const catalogs = await Promise.all(
    containers.map(async (c): Promise<TreeNode> => {
      const typePrefix = c.id.split("/")[0] ?? "";
      const memberLists = await Promise.all(
        childPrefixesOf(typePrefix).map((mp) => childrenOf(c.id, mp)),
      );
      const members = memberLists.flat();
      return { id: c.id, label: c.label, count: members.length, children: members };
    }),
  );

  return {
    id: iriToId(apiBase()),
    label: rootTitle,
    count: catalogs.reduce((sum, c) => sum + (c.count ?? 0), 0),
    children: catalogs,
  };
}

export function useTree() {
  const { defs, specFor } = useResourceTypes();

  // Top-level container types = the root definition's children (DCAT fallback).
  const topPrefixes = computed<string[]>(() => {
    const root = defs.value.find((d) => d.isRoot);
    const prefixes = root?.children.map((c) => c.target).filter(Boolean) ?? [];
    return prefixes.length ? prefixes : DCAT_TOP;
  });

  const childPrefixesOf = (type: EntityType): EntityType[] => specFor(type)?.childTypes ?? [];

  return useQuery({
    queryKey: computed(() => [...queryKeys.tree(), topPrefixes.value]),
    queryFn: () => fetchTree(topPrefixes.value, childPrefixesOf),
    staleTime: 5 * 60_000,
  });
}
