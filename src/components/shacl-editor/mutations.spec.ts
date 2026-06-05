import { describe, expect, it } from "vitest";
import {
  addField,
  addGroup,
  deleteField,
  deleteGroup,
  duplicateField,
  moveField,
  updateField,
  updateShape,
} from "./mutations";
import { newField } from "./factories";
import type { Field, SchemaDocument } from "./model";

function f(path: string): Field {
  const field = newField("TextFieldEditor");
  field.path = path;
  return field;
}

function doc(): SchemaDocument {
  return {
    prefixes: [],
    shapes: [
      {
        id: "s1", shapeIri: ":S", label: "S", comment: "", targetClass: "ex:S",
        groups: [
          { id: "g1", label: "A", order: 0, fields: [f("dct:title"), f("dct:description")] },
          { id: "g2", label: "B", order: 1, fields: [f("dct:issued")] },
        ],
      },
    ],
  };
}

const shape = (d: SchemaDocument) => d.shapes[0]!;
const group = (d: SchemaDocument, id: string) => shape(d).groups.find((g) => g.id === id)!;

describe("mutations", () => {
  it("returns a new document and leaves the input untouched", () => {
    const d0 = doc();
    const d1 = updateShape(d0, "s1", { label: "Changed" });
    expect(d1).not.toBe(d0);
    expect(shape(d0).label).toBe("S"); // input unchanged
    expect(shape(d1).label).toBe("Changed");
  });

  it("is a no-op for an unknown shape id", () => {
    const d0 = doc();
    expect(updateShape(d0, "nope", { label: "x" })).toBe(d0);
  });

  it("addGroup appends a group with the next order", () => {
    const d = addGroup(doc(), "s1", "C");
    expect(shape(d).groups.map((g) => g.label)).toEqual(["A", "B", "C"]);
    expect(shape(d).groups[2]?.order).toBe(2);
  });

  it("addField inserts at an index and renumbers sh:order", () => {
    const d = addField(doc(), "s1", "g1", "BooleanSelectEditor", 1);
    const g = group(d, "g1");
    expect(g.fields.map((x) => x.order)).toEqual([0, 1, 2]);
    expect(g.fields[1]?.editor).toBe("dash:BooleanSelectEditor");
  });

  it("updateField patches a field by id", () => {
    const d0 = doc();
    const id = group(d0, "g1").fields[0]!.id;
    const d = updateField(d0, "s1", id, { name: "Title", minCount: 1 });
    expect(group(d, "g1").fields[0]?.name).toBe("Title");
    expect(group(d, "g1").fields[0]?.minCount).toBe(1);
  });

  it("deleteField removes and renumbers", () => {
    const d0 = doc();
    const id = group(d0, "g1").fields[0]!.id;
    const d = deleteField(d0, "s1", id);
    const g = group(d, "g1");
    expect(g.fields).toHaveLength(1);
    expect(g.fields[0]?.order).toBe(0);
  });

  it("duplicateField inserts a copy right after the original with a new id", () => {
    const d0 = doc();
    const orig = group(d0, "g1").fields[0]!;
    const d = duplicateField(d0, "s1", orig.id);
    const g = group(d, "g1");
    expect(g.fields).toHaveLength(3);
    expect(g.fields[1]?.id).not.toBe(orig.id);
    expect(g.fields[1]?.name).toBe(`${orig.name} copy`);
    expect(g.fields.map((x) => x.order)).toEqual([0, 1, 2]);
  });

  it("moveField across groups renumbers both", () => {
    const d0 = doc();
    const id = group(d0, "g2").fields[0]!.id; // dct:issued
    const d = moveField(d0, "s1", id, "g1", 0); // to front of g1
    expect(group(d, "g1").fields.map((x) => x.path)).toEqual(["dct:issued", "dct:title", "dct:description"]);
    expect(group(d, "g1").fields.map((x) => x.order)).toEqual([0, 1, 2]);
    expect(group(d, "g2").fields).toHaveLength(0);
  });

  it("deleteGroup drops the group and reorders the rest", () => {
    const d = deleteGroup(doc(), "s1", "g1");
    expect(shape(d).groups.map((g) => g.id)).toEqual(["g2"]);
    expect(shape(d).groups[0]?.order).toBe(0);
  });
});
