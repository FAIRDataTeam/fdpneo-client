/**
 * buildTreeForest: assembles the browse container tree from SPARQL
 * (subject, title, parent) rows over dct:isPartOf.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { buildTreeForest, treeClassIris, treeQuery } from "./useTreeGraph";
import { ENTITY_SPECS, type EntitySpec, type EntityType } from "@/api/entityForms";
import { NS } from "@/api/rdf";
import type { SparqlBinding } from "@/api/sparql";

const BASE = "http://localhost:8000";
beforeEach(() => vi.stubEnv("VITE_FDP_API_URL", BASE));

function row(s: string, title: string | null, parent: string | null): SparqlBinding {
  const b: SparqlBinding = { s: { type: "uri", value: s } };
  if (title) b.title = { type: "literal", value: title };
  if (parent) b.parent = { type: "uri", value: parent };
  return b;
}

describe("buildTreeForest", () => {
  it("nests members under their catalog, sets counts, and leaves leaves badge-free", () => {
    const forest = buildTreeForest(
      [
        row(`${BASE}/catalog/a`, "Catalog A", BASE),
        row(`${BASE}/dataset/x`, "Dataset X", `${BASE}/catalog/a`),
        row(`${BASE}/data-service/s`, "Service S", `${BASE}/catalog/a`),
        row(`${BASE}/catalog/b`, "Catalog B", BASE),
      ],
      BASE,
    );

    // catalogs are top-level (parent === base)
    expect(forest.map((n) => n.id)).toEqual(["catalog/a", "catalog/b"]);

    const a = forest[0]!;
    expect(a.count).toBe(2);
    expect(a.children?.map((c) => c.id)).toEqual(["dataset/x", "data-service/s"]);

    // a childless catalog carries no count badge and no children array
    const b = forest[1]!;
    expect(b.count).toBeUndefined();
    expect(b.children).toBeUndefined();
  });

  it("falls back to a short label when title is missing; a node whose parent is absent surfaces at top level", () => {
    const forest = buildTreeForest(
      [
        row(`${BASE}/catalog/a`, null, BASE),
        row(`${BASE}/dataset/z`, "Z", `${BASE}/catalog/missing`),
      ],
      BASE,
    );
    expect(forest.find((n) => n.id === "catalog/a")?.label).toBe("a"); // shortLabel(iri)
    expect(forest.some((n) => n.id === "dataset/z")).toBe(true); // not dropped
  });
});

describe("treeClassIris", () => {
  const staticSpecFor = (t: EntityType) => ENTITY_SPECS[t] ?? null;

  it("walks the static DCAT hierarchy: containers + their members, but not deep leaf artifacts", () => {
    const iris = treeClassIris(["catalog"], staticSpecFor);
    expect(iris).toEqual(
      expect.arrayContaining([`${NS.dcat}Catalog`, `${NS.dcat}Dataset`, `${NS.dcat}DataService`]),
    );
    expect(iris).not.toContain(`${NS.dcat}Distribution`);
  });

  it("follows admin-configured types instead of the DCAT classes", () => {
    const spec = (type: string, classIri: string, childTypes: string[]): EntitySpec => ({
      type,
      classIri,
      label: type,
      prefix: type,
      childTypes,
      fields: [],
    });
    const specs: Record<string, EntitySpec> = {
      project: spec("project", "http://ex.org/Project", ["study", "project"]), // self-cycle
      study: spec("study", "http://ex.org/Study", ["sample"]),
      sample: spec("sample", "http://ex.org/Sample", []),
    };
    const iris = treeClassIris(["project"], (t) => specs[t] ?? null);
    expect(iris).toEqual(["http://ex.org/Project", "http://ex.org/Study"]);
  });

  it("ignores unknown types and empty targets", () => {
    expect(treeClassIris(["", "nope"], staticSpecFor)).toEqual([]);
  });
});

describe("treeQuery", () => {
  it("binds the class set via VALUES and selects only IRI subjects", () => {
    const q = treeQuery(["http://ex.org/A", "http://ex.org/B"]);
    expect(q).toContain("VALUES ?type { <http://ex.org/A> <http://ex.org/B> }");
    expect(q).toContain("FILTER(isIRI(?s))");
    expect(q).toContain(`<${NS.dct}isPartOf>`);
  });
});
