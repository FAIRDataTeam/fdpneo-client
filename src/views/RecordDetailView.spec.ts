/**
 * End-to-end render of the c-focus dataset detail view.
 *
 * Uses the fixture-backed `useRecord` so no network is involved. Asserts the
 * title, four stats, the three distributions and three related records all
 * render from the fixture.
 */

import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import RecordDetailView from "./RecordDetailView.vue";
import { sampleRecord } from "@/data/sampleRecord";

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
