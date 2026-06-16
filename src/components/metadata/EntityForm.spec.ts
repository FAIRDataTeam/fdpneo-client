/**
 * EntityForm renders a multi-value field (keywords) through RepeatableInput,
 * so authoring no longer goes through the lossy comma-joined input (TASKS 17.2).
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import EntityForm from "./EntityForm.vue";
import type { EntitySpec, EntityModel } from "@/api/entityForms";

const spec: EntitySpec = {
  type: "dataset",
  classIri: "http://www.w3.org/ns/dcat#Dataset",
  label: "Dataset",
  prefix: "dataset",
  childTypes: [],
  fields: [{ key: "keywords", predicate: "x", label: "Keywords", kind: "keywords" }],
};

function mountForm(model: EntityModel) {
  return mount(EntityForm, {
    props: { spec, modelValue: model },
    global: { plugins: [VueQueryPlugin, createPinia()] },
  });
}

describe("EntityForm multi-value fields", () => {
  it("renders one input per keyword value (not a comma-joined field)", () => {
    const w = mountForm({ keywords: ["a", "b"] });
    expect(w.findAll("input")).toHaveLength(2);
    expect((w.findAll("input")[0]!.element as HTMLInputElement).value).toBe("a");
  });

  it("Add appends an empty value to the bound array", async () => {
    const model: EntityModel = { keywords: ["a"] };
    const w = mountForm(model);
    await w.get('button[aria-label="Add Keywords"]').trigger("click");
    expect(model.keywords).toEqual(["a", ""]);
  });

  it("remove drops the value at that index from the bound array", async () => {
    const model: EntityModel = { keywords: ["a", "b"] };
    const w = mountForm(model);
    await w.get('button[aria-label="Remove Keywords value 1"]').trigger("click");
    expect(model.keywords).toEqual(["b"]);
  });
});
