/**
 * Component test for the admin readiness indicator.
 *
 * `useReadiness` is mocked so we drive the four states the strip distinguishes
 * — ready, degraded, still-loading, and errored — without a live server. The
 * composable already hides itself for non-admins (it's `enabled` on the admin
 * role), so the strip only has to render whatever report it is handed.
 */

import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import type { ReadinessReport } from "@/api/info";

const state = {
  data: ref<ReadinessReport | undefined>(undefined),
  isError: ref(false),
};

vi.mock("@/composables/useAppInfo", () => ({
  useReadiness: () => state,
}));

import ReadinessStrip from "./ReadinessStrip.vue";

function reset(data: ReadinessReport | undefined, isError = false) {
  state.data.value = data;
  state.isError.value = isError;
}

describe("ReadinessStrip", () => {
  it("renders nothing until the first probe resolves", () => {
    reset(undefined);
    const wrapper = mount(ReadinessStrip);
    expect(wrapper.find(".chip").exists()).toBe(false);
  });

  it("shows an ok chip when every dependency is up", () => {
    reset({
      status: "ready",
      checks: { postgres: { status: "ok" }, oidc: { status: "ok" } },
    });
    const wrapper = mount(ReadinessStrip);
    const chip = wrapper.find(".chip");
    expect(chip.exists()).toBe(true);
    expect(chip.classes()).toContain("ok");
    expect(wrapper.text()).toBe("All systems ready");
    // Per-check breakdown is exposed for hover.
    expect(chip.attributes("title")).toContain("postgres: ok");
  });

  it("lists the failed dependencies when degraded", () => {
    reset({
      status: "not_ready",
      checks: {
        postgres: { status: "fail" },
        triplestore: { status: "ok" },
        oidc: { status: "fail" },
      },
    });
    const wrapper = mount(ReadinessStrip);
    const chip = wrapper.find(".chip");
    expect(chip.classes()).toContain("signal");
    expect(wrapper.text()).toBe("Degraded: postgres, oidc");
  });

  it("falls back to an unknown state on a probe error", () => {
    reset(undefined, true);
    const wrapper = mount(ReadinessStrip);
    const chip = wrapper.find(".chip");
    expect(chip.exists()).toBe(true);
    expect(chip.classes()).toContain("signal");
    expect(wrapper.text()).toBe("Readiness unknown");
  });
});
