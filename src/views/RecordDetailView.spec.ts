/**
 * End-to-end render of the c-focus dataset detail view.
 *
 * The view fans out over several data composables; this test exercises the
 * view's *rendering*, not the data layer (the RDF mapping is covered directly
 * in `src/api/rdf.spec.ts`). So we mock every composable the view mounts —
 * `useRecord` returns the shared fixture, the rest return inert refs. Mocking
 * them all is what keeps the run quiet: leaving the siblings live let them fire
 * real XHR that jsdom rejected as cross-origin (the old `localhost:3000` noise).
 * Asserts the title, stats, distributions and related records render.
 */

import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import RecordDetailView from "./RecordDetailView.vue";
import { sampleRecord } from "@/data/sampleRecord";

vi.mock("@/composables/useRecord", async () => {
  const { ref } = await import("vue");
  const { sampleRecord: fixture } = await import("@/data/sampleRecord");
  return {
    useRecord: () => ({
      data: ref(fixture),
      isLoading: ref(false),
      isError: ref(false),
    }),
  };
});

// The detail view also mounts these network-backed composables. Stub them with
// inert returns so no XHR fires during the render test.
vi.mock("@/composables/useResourceTypes", async () => {
  const { ref } = await import("vue");
  return {
    useResourceTypes: () => ({
      defs: ref([]),
      isLoading: ref(false),
      isError: ref(false),
      specFor: () => null,
      typeForId: () => null,
      childSpecs: () => [],
    }),
  };
});
vi.mock("@/composables/useChildRecords", async () => {
  const { ref } = await import("vue");
  return { useChildRecords: () => ({ children: ref([]) }) };
});
vi.mock("@/composables/useAncestors", async () => {
  const { ref } = await import("vue");
  return { useAncestors: () => ({ crumbs: ref([]) }) };
});
vi.mock("@/composables/useRecordState", async () => {
  const { ref } = await import("vue");
  return {
    useRecordState: () => ({
      state: ref(null),
      transition: { mutate: vi.fn(), error: ref(null), isPending: ref(false) },
    }),
  };
});

describe("RecordDetailView (c-focus)", () => {
  it("renders the fixture record end-to-end", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/records/:id+",
          name: "record-detail",
          component: RecordDetailView,
        },
      ],
    });
    await router.push(`/records/${sampleRecord.id}`);
    await router.isReady();

    const wrapper = mount(RecordDetailView, {
      global: { plugins: [createPinia(), router, VueQueryPlugin] },
    });

    // All data is mocked synchronously — just let Vue flush its update queue.
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain(sampleRecord.title);
    expect(text).toContain("Participants");
    expect(text).toContain(String(sampleRecord.participants));
    expect(text).toContain("Distributions");
    for (const d of sampleRecord.distributions) {
      expect(text).toContain(d.title);
    }
    for (const rel of sampleRecord.related) {
      expect(text).toContain(rel.title);
    }
  });
});
