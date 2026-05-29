/**
 * End-to-end render of the c-focus dataset detail view.
 *
 * `useRecord` now fetches over the network, so we mock it with the shared
 * fixture: this test exercises the view's rendering, not the data layer
 * (the RDF mapping is covered directly in `src/api/rdf.spec.ts`). Asserts the
 * title, the stats, distributions and related records render from the record.
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

    // wait for the fake-fetch (200ms) and Vue updates
    await new Promise((r) => setTimeout(r, 250));
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
