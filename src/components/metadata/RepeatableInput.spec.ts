import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import RepeatableInput from "./RepeatableInput.vue";

const base = { label: "Keywords" };

describe("RepeatableInput", () => {
  it("renders one input per value", () => {
    const w = mount(RepeatableInput, { props: { ...base, modelValue: ["a", "b"] } });
    expect(w.findAll("input")).toHaveLength(2);
  });

  it("edits a value in place, emitting the whole array", async () => {
    const w = mount(RepeatableInput, { props: { ...base, modelValue: ["a", "b"] } });
    await w.findAll("input")[1]!.setValue("B");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([["a", "B"]]);
  });

  it("Add appends an empty row", async () => {
    const w = mount(RepeatableInput, { props: { ...base, modelValue: ["a"] } });
    await w.get('button[aria-label="Add Keywords"]').trigger("click");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([["a", ""]]);
  });

  it("removes the value at the clicked index", async () => {
    const w = mount(RepeatableInput, { props: { ...base, modelValue: ["a", "b", "c"] } });
    await w.get('button[aria-label="Remove Keywords value 2"]').trigger("click");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([["a", "c"]]);
  });

  it("hides Add once maxCount is reached", () => {
    const w = mount(RepeatableInput, {
      props: { ...base, modelValue: ["a", "b"], maxCount: 2 },
    });
    expect(w.find('button[aria-label="Add Keywords"]').exists()).toBe(false);
  });

  it("hides remove while at minCount", () => {
    const w = mount(RepeatableInput, {
      props: { ...base, modelValue: ["a"], minCount: 1 },
    });
    expect(w.find("button.remove").exists()).toBe(false);
  });

  it("shows just the Add button when empty", () => {
    const w = mount(RepeatableInput, { props: { ...base, modelValue: [] } });
    expect(w.findAll("input")).toHaveLength(0);
    expect(w.get('button[aria-label="Add Keywords"]').text()).toContain("Add");
  });

  it("uses a url input when type is url", () => {
    const w = mount(RepeatableInput, {
      props: { ...base, label: "Same as", type: "url", modelValue: ["https://x"] },
    });
    expect(w.get("input").attributes("type")).toBe("url");
  });

  it("explodes a comma-separated paste into multiple rows", async () => {
    const w = mount(RepeatableInput, { props: { ...base, modelValue: [""] } });
    await w.get("input").trigger("paste", {
      clipboardData: { getData: () => "a, b ,, c" },
    });
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([["a", "b", "c"]]);
  });
});
