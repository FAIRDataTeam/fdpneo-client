/**
 * StateBadge: a coloured chip per publication state, nothing when unknown.
 */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import StateBadge from "./StateBadge.vue";

describe("StateBadge", () => {
  it("renders a green chip for PUBLISHED", () => {
    const w = mount(StateBadge, { props: { state: "PUBLISHED" } });
    expect(w.text()).toBe("Published");
    expect(w.find(".chip").classes()).toContain("ok");
  });

  it("renders a signal chip for DRAFT", () => {
    const w = mount(StateBadge, { props: { state: "DRAFT" } });
    expect(w.text()).toBe("Draft");
    expect(w.find(".chip").classes()).toContain("signal");
  });

  it("renders nothing when state is null", () => {
    const w = mount(StateBadge, { props: { state: null } });
    expect(w.find(".chip").exists()).toBe(false);
  });
});
