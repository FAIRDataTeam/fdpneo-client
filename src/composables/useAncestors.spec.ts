/**
 * useAncestors: walks dct:isPartOf from the record to the root, returning crumbs
 * ordered root → current with a label, route target, and record kind. The root
 * is the FDP repository (kind "fdp"); other hops classify from rdf:type.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";

const fetchExpanded = vi.fn();
vi.mock("@/api/extensions", () => ({ fetchExpanded: () => fetchExpanded() }));

import { useAncestors, type Crumb } from "./useAncestors";

const TURTLE = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dct: <http://purl.org/dc/terms/> .
<http://localhost:8000/dataset/d1> a dcat:Dataset ;
  dct:title "Brain MRI" ;
  dct:isPartOf <http://localhost:8000/catalog/c1> .
<http://localhost:8000/catalog/c1> a dcat:Catalog ;
  dct:title "Imaging" ;
  dct:isPartOf <http://localhost:8000> .
<http://localhost:8000> dct:title "Repo" .
`;

beforeEach(() => {
  vi.stubEnv("VITE_FDP_API_URL", "http://localhost:8000");
  fetchExpanded.mockReset();
});

async function run(id: string): Promise<Crumb[]> {
  let out!: ReturnType<typeof useAncestors>;
  mount(
    defineComponent({
      setup() {
        out = useAncestors(ref(id));
        return () => null;
      },
    }),
    { global: { plugins: [VueQueryPlugin] } },
  );
  await flushPromises();
  await new Promise((r) => setTimeout(r, 10));
  await flushPromises();
  return out.crumbs.value;
}

describe("useAncestors", () => {
  it("builds the root → current chain with kind and route targets", async () => {
    fetchExpanded.mockResolvedValue(TURTLE);
    const crumbs = await run("dataset/d1");

    expect(crumbs.map((c) => c.type)).toEqual(["fdp", "catalog", "dataset"]);
    expect(crumbs.map((c) => c.label)).toEqual(["Repo", "Imaging", "Brain MRI"]);
    // Root browses at "/", ancestors at /records/:id, current is not a link.
    expect(crumbs.map((c) => c.to)).toEqual(["/", "/records/catalog/c1", null]);
  });

  it("yields no crumbs when /expanded is unavailable", async () => {
    fetchExpanded.mockRejectedValue(new Error("nope"));
    expect(await run("dataset/d1")).toEqual([]);
  });
});
