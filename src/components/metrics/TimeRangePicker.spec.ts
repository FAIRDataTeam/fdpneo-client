import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TimeRangePicker from "./TimeRangePicker.vue";

describe("TimeRangePicker", () => {
  it("renders all four ranges and marks the bound value active", () => {
    const w = mount(TimeRangePicker, { props: { modelValue: "30d" } });
    const buttons = w.findAll("button");
    expect(buttons.map((b) => b.text())).toEqual(["24h", "7d", "30d", "90d"]);
    const active = buttons.find((b) => b.classes().includes("active"));
    expect(active?.text()).toBe("30d");
    expect(active?.attributes("aria-checked")).toBe("true");
  });

  it("emits update:modelValue when a different range is selected", async () => {
    const w = mount(TimeRangePicker, { props: { modelValue: "30d" } });
    const sevenDay = w.findAll("button").find((b) => b.text() === "7d");
    await sevenDay!.trigger("click");
    expect(w.emitted("update:modelValue")).toEqual([["7d"]]);
  });

  it("does not emit when the currently-selected range is clicked", async () => {
    const w = mount(TimeRangePicker, { props: { modelValue: "30d" } });
    const thirtyDay = w.findAll("button").find((b) => b.text() === "30d");
    await thirtyDay!.trigger("click");
    expect(w.emitted("update:modelValue")).toBeUndefined();
  });
});
