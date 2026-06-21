/**
 * useChildRecords fetches one LDP page per child type and merges them into a
 * flat, type-labelled list. A child type that errors (no readable members, or a
 * transient failure) contributes nothing without breaking the others, and the
 * query stays disabled until both an id and at least one child type are present.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";

const fetchChildrenPage = vi.fn();
vi.mock("@/api/extensions", () => ({
  fetchChildrenPage: (...args: unknown[]) => fetchChildrenPage(...args),
}));

import { useChildRecords, type ChildType } from "./useChildRecords";

beforeEach(() => {
  fetchChildrenPage.mockReset();
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

describe("useChildRecords", () => {
  it("merges one page per child type and tags each row with its type label", async () => {
    fetchChildrenPage.mockImplementation((_id: string, prefix: string) =>
      prefix === "catalog"
        ? Promise.resolve({ children: [{ id: "catalog/c1", label: "Cat 1" }] })
        : Promise.resolve({ children: [{ id: "dataset/d1", label: "Data 1" }] }),
    );

    const out = await run("repo", TYPES);

    expect(out.children.value).toEqual([
      { id: "catalog/c1", label: "Cat 1", typeLabel: "Catalog" },
      { id: "dataset/d1", label: "Data 1", typeLabel: "Dataset" },
    ]);
  });

  it("drops a failing child type but still renders the rest", async () => {
    fetchChildrenPage.mockImplementation((_id: string, prefix: string) =>
      prefix === "catalog"
        ? Promise.reject(new Error("403 forbidden"))
        : Promise.resolve({ children: [{ id: "dataset/d1", label: "Data 1" }] }),
    );

    const out = await run("repo", TYPES);

    expect(out.children.value).toEqual([{ id: "dataset/d1", label: "Data 1", typeLabel: "Dataset" }]);
  });

  it("stays disabled (no fetch) until there is a child type to load", async () => {
    const out = await run("repo", []);
    expect(fetchChildrenPage).not.toHaveBeenCalled();
    expect(out.children.value).toEqual([]);
  });
});
