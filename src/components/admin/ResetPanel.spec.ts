/**
 * ResetPanel: the reset button is gated on typing the exact confirmation token;
 * confirming calls the reset and reports the result. Destructive call is mocked.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";

const resetToFactoryDefaults = vi.fn();
vi.mock("@/api/admin", () => ({
  RESET_CONFIRMATION_TOKEN: "reset-to-factory-defaults",
  resetToFactoryDefaults: (c: string) => resetToFactoryDefaults(c),
}));

import ResetPanel from "./ResetPanel.vue";

const mountPanel = () => mount(ResetPanel, { global: { plugins: [VueQueryPlugin] } });

beforeEach(() => resetToFactoryDefaults.mockReset());

describe("ResetPanel", () => {
  it("keeps the button disabled until the exact token is typed", async () => {
    const w = mountPanel();
    expect(w.find("button").attributes("disabled")).toBeDefined();
    await w.find("input").setValue("reset");
    expect(w.find("button").attributes("disabled")).toBeDefined();
    await w.find("input").setValue("reset-to-factory-defaults");
    expect(w.find("button").attributes("disabled")).toBeUndefined();
  });

  it("runs the reset and reports the counts on success", async () => {
    resetToFactoryDefaults.mockResolvedValueOnce({
      profileName: "default", profileVersion: "1", settingsCleared: 2,
      schemas: 3, offers: 1, resourceDefinitions: 5, seedRecords: 4,
    });
    const w = mountPanel();
    await w.find("input").setValue("reset-to-factory-defaults");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(resetToFactoryDefaults).toHaveBeenCalledWith("reset-to-factory-defaults");
    expect(w.find(".ok").text()).toContain("Re-applied profile default v1");
  });

  it("does nothing when the phrase is wrong", async () => {
    const w = mountPanel();
    await w.find("input").setValue("nope");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(resetToFactoryDefaults).not.toHaveBeenCalled();
  });
});
