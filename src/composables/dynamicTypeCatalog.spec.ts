/**
 * TASKS 11.2 — the read composables (`useSearch`, `useTree`) must derive their
 * `rdf:type` filters from the live type catalog, not a hardcoded DCAT map, so a
 * runtime-registered type (here `biobank`) is searchable and shows in the tree.
 *
 * `sparqlSelect` is mocked to capture the emitted query; `useResourceTypes` is
 * mocked with a catalog that includes a custom container/member type.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";

const sparqlSelect = vi.fn().mockResolvedValue([]);
vi.mock("@/api/sparql", () => ({
  sparqlSelect: (q: string) => sparqlSelect(q),
  value: () => undefined,
  literal: (s: string) => JSON.stringify(s),
}));

const BIOBANK_CLASS = "https://example.org/onto#Biobank";
const DATASET_CLASS = "https://example.org/onto#Dataset";

// A catalog whose root holds `biobank` containers, which in turn hold `dataset`
// members — neither expressed via the built-in DCAT constants.
const SPECS: Record<string, { classIri: string; label: string; childTypes: string[] }> = {
  biobank: { classIri: BIOBANK_CLASS, label: "Biobank", childTypes: ["dataset"] },
  dataset: { classIri: DATASET_CLASS, label: "Dataset", childTypes: [] },
};

vi.mock("@/composables/useResourceTypes", () => ({
  useResourceTypes: () => ({
    defs: ref([
      { urlPrefix: "", isRoot: true, children: [{ target: "biobank" }] },
      { urlPrefix: "biobank", isRoot: false, children: [{ target: "dataset" }] },
      { urlPrefix: "dataset", isRoot: false, children: [] },
    ]),
    specFor: (type: string) => SPECS[type] ?? null,
  }),
}));

import { useSearch } from "./useSearch";
import { useTree } from "./useTree";

function lastQuery(): string {
  return sparqlSelect.mock.calls.at(-1)?.[0] ?? "";
}

async function run(composable: () => unknown) {
  const Comp = defineComponent({
    setup() {
      composable();
      return () => null;
    },
  });
  mount(Comp, { global: { plugins: [VueQueryPlugin] } });
  await flushPromises();
  await new Promise((r) => setTimeout(r, 10));
  await flushPromises();
}

beforeEach(() => sparqlSelect.mockClear());

describe("useSearch (dynamic type catalog)", () => {
  it("filters on every catalog class IRI when no facet is selected", async () => {
    await run(() => useSearch(ref(""), ref({})));
    const q = lastQuery();
    expect(q).toContain(`<${BIOBANK_CLASS}>`);
    expect(q).toContain(`<${DATASET_CLASS}>`);
  });

  it("resolves a custom type facet prefix to its class IRI", async () => {
    await run(() => useSearch(ref(""), ref({ type: ["biobank"] })));
    const q = lastQuery();
    expect(q).toContain(`<${BIOBANK_CLASS}>`);
    expect(q).not.toContain(`<${DATASET_CLASS}>`);
  });
});

describe("useTree (dynamic type catalog)", () => {
  it("builds the hierarchy from the catalog's container/member classes", async () => {
    await run(() => useTree());
    // fetchRootTitle + hierarchy query both fire; the hierarchy one carries the
    // container (biobank) and member (dataset) classes.
    const queries = sparqlSelect.mock.calls.map((c) => c[0] as string);
    const hierarchy = queries.find((q) => q.includes("isPartOf")) ?? "";
    expect(hierarchy).toContain(`<${BIOBANK_CLASS}>`);
    expect(hierarchy).toContain(`<${DATASET_CLASS}>`);
  });
});
