/**
 * buildTreeForest: assembles the browse container tree from SPARQL
 * (subject, title, parent) rows over dct:isPartOf.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { buildTreeForest } from "./useTreeGraph";
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
