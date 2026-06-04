/**
 * The read composables stay catalog-driven (TASKS 11.2) over their real
 * endpoints: `useSearch` → `POST /search` (10.2), `useTree` → `/page` (10.9).
 * `useResourceTypes` is mocked with a catalog including a custom type so we can
 * assert request building + result mapping without a live server.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";

// useSearch posts to /search (TASKS 10.2).
const runSearch = vi.fn().mockResolvedValue({ items: [], total: 0, facets: {} });
vi.mock("@/api/search", () => ({ runSearch: (req: unknown) => runSearch(req) }));

// useTree now lists via the /page read-extension, not SPARQL (TASKS 10.9).
const fetchChildrenPage = vi.fn();
vi.mock("@/api/extensions", () => ({
  fetchChildrenPage: (parentId: string, childPrefix: string) =>
    fetchChildrenPage(parentId, childPrefix),
}));
vi.mock("@/api/records", () => ({
  readGraph: () => Promise.resolve({ turtle: "", etag: null }),
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

async function run<T>(composable: () => T): Promise<T> {
  let out!: T;
  const Comp = defineComponent({
    setup() {
      out = composable();
      return () => null;
    },
  });
  mount(Comp, { global: { plugins: [VueQueryPlugin] } });
  await flushPromises();
  await new Promise((r) => setTimeout(r, 10));
  await flushPromises();
  return out;
}

beforeEach(() => {
  vi.stubEnv("VITE_FDP_API_URL", "http://localhost:8000");
  runSearch.mockReset();
  runSearch.mockResolvedValue({ items: [], total: 0, facets: {} });
});

describe("useSearch (POST /search)", () => {
  it("builds the request from the query text and facet selections", async () => {
    await run(() => useSearch(ref("cancer"), ref({ type: ["biobank"], license: ["https://cc/by"] })));
    expect(runSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "cancer",
        types: ["biobank"],
        license: "https://cc/by",
        offset: 0,
      }),
    );
  });

  it("maps a result's type_iri to a catalog label", async () => {
    runSearch.mockResolvedValueOnce({
      items: [{ recordIri: "http://localhost:8000/dataset/d1", typeIri: DATASET_CLASS, title: "D1" }],
      total: 1,
      facets: {},
    });
    const out = await run(() => useSearch(ref(""), ref({})));
    expect(out.data.value?.items[0]).toMatchObject({ id: "dataset/d1", typeLabel: "Dataset" });
  });
});

describe("useTree (dynamic type catalog)", () => {
  beforeEach(() => {
    fetchChildrenPage.mockReset();
    // Root holds one biobank; that biobank holds no datasets.
    fetchChildrenPage.mockImplementation((parentId: string, childPrefix: string) => {
      if (parentId === "" && childPrefix === "biobank") {
        return Promise.resolve({
          children: [{ id: "biobank/bb1", label: "Biobank One", typeIri: BIOBANK_CLASS }],
          total: 1,
        });
      }
      return Promise.resolve({ children: [], total: 0 });
    });
  });

  it("pages children by the catalog's container then member prefixes", async () => {
    await run(() => useTree());
    const calls = fetchChildrenPage.mock.calls;
    // Root → biobank containers, then that biobank → dataset members. Neither
    // prefix is hardcoded; both come from the (mocked) type catalog.
    expect(calls).toContainEqual(["", "biobank"]);
    expect(calls).toContainEqual(["biobank/bb1", "dataset"]);
  });
});
