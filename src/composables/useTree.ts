/**
 * `useTree` — the repository → containers → members hierarchy for the
 * container browser.
 *
 * Built from SPARQL: the root repository's title plus each container record
 * and the members that declare it as their `dct:isPartOf` parent. Node ids are
 * path ids so they double as `/records/:id` targets.
 *
 * The container/member class set is runtime-mutable on the server, so it is
 * derived from the live type catalog (`useResourceTypes`) — the root
 * definition's children are the top-level containers, and *their* children are
 * the members. A deployment that registers custom container/member types gets
 * a correct tree without code changes. When the catalog is unavailable the
 * sets fall back to plain DCAT (Catalog → Dataset/DataService), so standard
 * deployments keep working offline.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { queryKeys } from "@/api/queries";
import { apiBase, iriToId, NS } from "@/api/rdf";
import { sparqlSelect, value } from "@/api/sparql";
import { useResourceTypes } from "@/composables/useResourceTypes";
import type { TreeNode } from "@/data/sampleRecord";

const DCAT_CONTAINERS = [`${NS.dcat}Catalog`];
const DCAT_MEMBERS = [`${NS.dcat}Dataset`, `${NS.dcat}DataService`];

interface ClassSets {
  containers: string[];
  members: string[];
}

function buildHierarchyQuery({ containers, members }: ClassSets): string {
  const cList = containers.map((iri) => `<${iri}>`).join(", ");
  const mList = members.map((iri) => `<${iri}>`).join(", ");
  return `SELECT ?c ?ctitle ?d ?dtitle WHERE {
  GRAPH ?c { ?c a ?ctype ; <${NS.dct}title> ?ctitle . FILTER( ?ctype IN (${cList}) ) }
  OPTIONAL {
    GRAPH ?d { ?d a ?dtype ; <${NS.dct}isPartOf> ?c ; <${NS.dct}title> ?dtitle . FILTER( ?dtype IN (${mList}) ) }
  }
} ORDER BY ?ctitle ?dtitle`;
}

async function fetchRootTitle(): Promise<string> {
  const base = apiBase();
  const rows = await sparqlSelect(
    `SELECT ?title WHERE { GRAPH <${base}> { <${base}> <${NS.dct}title> ?title } }`,
  );
  return value(rows[0] ?? {}, "title") ?? "Repository";
}

async function fetchTree(classes: ClassSets): Promise<TreeNode> {
  const [rootTitle, rows] = await Promise.all([
    fetchRootTitle(),
    sparqlSelect(buildHierarchyQuery(classes)),
  ]);

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
  const { defs, specFor } = useResourceTypes();

  // Container classes = the root definition's children; member classes =
  // those containers' children. Falls back to DCAT when the catalog is empty.
  const classes = computed<ClassSets>(() => {
    const root = defs.value.find((d) => d.isRoot);
    const containerPrefixes = root?.children.map((c) => c.target).filter(Boolean) ?? [];
    const containerSpecs = containerPrefixes
      .map((p) => specFor(p))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const containers = containerSpecs.map((s) => s.classIri);
    const memberPrefixes = new Set(containerSpecs.flatMap((s) => s.childTypes));
    const members = [...memberPrefixes]
      .map((p) => specFor(p))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => s.classIri);

    return {
      containers: containers.length ? containers : DCAT_CONTAINERS,
      members: members.length ? members : DCAT_MEMBERS,
    };
  });

  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.tree(),
      classes.value.containers,
      classes.value.members,
    ]),
    queryFn: () => fetchTree(classes.value),
    staleTime: 5 * 60_000,
  });
}
