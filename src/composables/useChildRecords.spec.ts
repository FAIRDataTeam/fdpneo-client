/**
 * useChildRecords enumerates a container's children via SPARQL (records that
 * declare `dct:isPartOf <parent>`), mapping each binding to a summary row:
 * title, description, split keywords, a child count, and a display kind +
 * label derived from the path prefix. The query runs on any non-empty id
 * (children come from actual `dct:isPartOf` containment, not the parent's
 * declared child types) and excludes distributions.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";
import type { SparqlBinding } from "@/api/sparql";

const sparqlSelect = vi.fn();
// Keep the real `value` helper; only stub the network-backed `sparqlSelect`.
vi.mock("@/api/sparql", async (orig) => ({
  ...(await orig<typeof import("@/api/sparql")>()),
  sparqlSelect: (...args: unknown[]) => sparqlSelect(...args),
}));

import { useChildRecords, type ChildType } from "./useChildRecords";

beforeEach(() => {
  sparqlSelect.mockReset();
});

async function run(id: string, childTypes: ChildType[]) {
  let out!: ReturnType<typeof useChildRecords>;
  mount(
    defineComponent({
      setup() {
        out = useChildRecords(ref(id), ref(childTypes));
        return () => null;
      },
    }),
    { global: { plugins: [VueQueryPlugin] } },
  );
  await flushPromises();
  await new Promise((r) => setTimeout(r, 10));
  await flushPromises();
  return out;
}

const TYPES: ChildType[] = [
  { prefix: "catalog", label: "Catalog" },
  { prefix: "dataset", label: "Dataset" },
];

const row = (b: Record<string, string>): SparqlBinding =>
  Object.fromEntries(Object.entries(b).map(([k, v]) => [k, { type: "literal", value: v }]));

describe("useChildRecords", () => {
  it("maps each binding to a summary row with kind, label, description, keywords and child count", async () => {
    sparqlSelect.mockResolvedValue([
      row({ s: "catalog/c1", title: "Cat 1", desc: "A catalog", kws: "a|||b", n: "2" }),
      row({ s: "dataset/d1", title: "Data 1", desc: "A dataset", kws: "", n: "0" }),
    ]);

    const out = await run("repo", TYPES);

    expect(out.children.value).toEqual([
      { id: "catalog/c1", label: "Cat 1", type: "catalog", typeLabel: "Catalog", description: "A catalog", keywords: ["a", "b"], childCount: 2 },
      { id: "dataset/d1", label: "Data 1", type: "dataset", typeLabel: "Dataset", description: "A dataset", keywords: [], childCount: 0 },
    ]);
  });

  it("falls back to a capitalised prefix + dataset kind for a type not in the catalog", async () => {
    sparqlSelect.mockResolvedValue([row({ s: "ontology/o1", title: "Onto 1" })]);

    const out = await run("repo", TYPES);

    expect(out.children.value).toEqual([
      { id: "ontology/o1", label: "Onto 1", type: "dataset", typeLabel: "Ontology", description: "", keywords: [], childCount: 0 },
    ]);
  });

  it("stays disabled (no query) when there is no id", async () => {
    const out = await run("", TYPES);
    expect(sparqlSelect).not.toHaveBeenCalled();
    expect(out.children.value).toEqual([]);
  });

  it("runs even with no declared child types and excludes distributions", async () => {
    sparqlSelect.mockResolvedValue([row({ s: "dataset/d1", title: "Data 1" })]);

    const out = await run("catalog/c1", []);

    expect(sparqlSelect).toHaveBeenCalledTimes(1);
    const q = sparqlSelect.mock.calls[0]![0] as string;
    expect(q).toContain("FILTER NOT EXISTS");
    expect(q).toContain("Distribution");
    // No catalog entry for the prefix → label falls back to the capitalised prefix.
    expect(out.children.value).toEqual([
      { id: "dataset/d1", label: "Data 1", type: "dataset", typeLabel: "Dataset", description: "", keywords: [], childCount: 0 },
    ]);
  });
});
