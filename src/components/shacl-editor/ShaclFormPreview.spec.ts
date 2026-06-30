/**
 * ShaclFormPreview — the steward's "test what curators see" form (task 4.4).
 *
 * Focuses on the DASH-widget rendering that closed note 12.25's last gap: the
 * reference editors render the real `ReferencePicker` (a class-instance lookup),
 * and the nested / blank-node editors render their own note instead of a plain
 * text input. The pure dispatch logic is covered in `preview.spec.ts`; this
 * verifies the template wires each `previewKind` to the right control.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import ShaclFormPreview from "./ShaclFormPreview.vue";
import ReferencePicker from "@/components/metadata/ReferencePicker.vue";
import { newField, newGroup } from "./factories";
import { PREFIXES } from "@/rdf/namespaces";
import type { Field, ShapeModel } from "./model";

function shapeWith(fields: Field[]): ShapeModel {
  const g = newGroup("General", 0);
  g.fields = fields;
  return {
    id: "s1",
    shapeIri: ":TestShape",
    label: "Test",
    comment: "",
    targetClass: "dcat:Dataset",
    groups: [g],
  };
}

function render(shape: ShapeModel) {
  return mount(ShaclFormPreview, {
    props: { shape, prefixes: PREFIXES },
    global: { plugins: [VueQueryPlugin] },
  });
}

describe("ShaclFormPreview", () => {
  // The preview reads the locale store for the language-picker ordering.
  beforeEach(() => setActivePinia(createPinia()));

  it("renders a ReferencePicker for an instances-select editor", () => {
    const field = newField("InstancesSelectEditor");
    field.path = "dct:publisher";
    field.class = "foaf:Agent";
    const w = render(shapeWith([field]));

    const picker = w.findComponent(ReferencePicker);
    expect(picker.exists()).toBe(true);
    // The prefixed sh:class is expanded to a full IRI for the lookup.
    expect(picker.props("classIri")).toBe("http://xmlns.com/foaf/0.1/Agent");
    expect(picker.props("widget")).toBe("instances");
  });

  it("renders a note for nested and blank-node editors (not a text input)", () => {
    const details = newField("DetailsEditor");
    details.path = "dct:spatial";
    const blank = newField("BlankNodeEditor");
    blank.path = "dct:temporal";
    const w = render(shapeWith([details, blank]));

    const notes = w.findAll(".nested");
    expect(notes).toHaveLength(2);
    expect(w.text()).toContain("Nested record");
    expect(w.text()).toContain("Blank node");
    // No bare inputs were rendered for these fields.
    expect(w.findAll("input")).toHaveLength(0);
    expect(w.findComponent(ReferencePicker).exists()).toBe(false);
  });

  it("falls back to a URL input when a reference field has no class", () => {
    const field = newField("AutoCompleteEditor");
    field.path = "dct:publisher";
    field.class = null; // no sh:class → can't offer a lookup
    const w = render(shapeWith([field]));

    expect(w.findComponent(ReferencePicker).exists()).toBe(false);
    expect(w.find("input[type='url']").exists()).toBe(true);
  });
});
