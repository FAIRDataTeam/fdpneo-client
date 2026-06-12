import { describe, expect, it } from "vitest";
import { isEmptyValue, missingRequired, previewKind, refWidget } from "./preview";
import { newField } from "./factories";
import type { Field } from "./model";

function f(over: Partial<Field>): Field {
  return { ...newField("TextFieldEditor"), ...over };
}

describe("previewKind", () => {
  it("dispatches on SHACL constraints first", () => {
    expect(previewKind(f({ inValues: ["a", "b"] }))).toBe("enum");
    expect(previewKind(f({ datatype: "xsd:boolean" }))).toBe("boolean");
    expect(previewKind(f({ datatype: "xsd:date" }))).toBe("date");
    expect(previewKind(f({ datatype: "xsd:dateTime" }))).toBe("datetime");
    expect(previewKind(f({ datatype: "xsd:integer" }))).toBe("number");
    expect(previewKind(f({ datatype: null, nodeKind: "sh:IRI" }))).toBe("iri");
    expect(previewKind(f({ datatype: "xsd:string" }))).toBe("text");
  });

  it("falls back to widget hints for textarea", () => {
    expect(previewKind(f({ widgetId: "TextAreaEditor", datatype: null }))).toBe("textarea");
    expect(previewKind(f({ datatype: "rdf:HTML" }))).toBe("textarea");
  });

  it("honors DASH reference / nested / blank-node editors (not a plain IRI)", () => {
    expect(previewKind(newField("AutoCompleteEditor"))).toBe("ref");
    expect(previewKind(newField("InstancesSelectEditor"))).toBe("ref");
    expect(previewKind(newField("SubClassEditor"))).toBe("ref");
    expect(previewKind(newField("DetailsEditor"))).toBe("details");
    expect(previewKind(newField("BlankNodeEditor"))).toBe("blanknode");
    // URIEditor is a plain IRI input, not a picker.
    expect(previewKind(newField("URIEditor"))).toBe("iri");
  });

  it("detects the widget from the dash:editor IRI when widgetId is absent", () => {
    // Fields parsed from arbitrary SHACL may carry only the editor IRI.
    expect(previewKind(f({ widgetId: "", editor: "dash:InstancesSelectEditor", datatype: null }))).toBe("ref");
  });
});

describe("refWidget", () => {
  it("maps the three reference editors to their lookup widget", () => {
    expect(refWidget(newField("AutoCompleteEditor"))).toBe("autocomplete");
    expect(refWidget(newField("InstancesSelectEditor"))).toBe("instances");
    expect(refWidget(newField("SubClassEditor"))).toBe("subclass");
    expect(refWidget(newField("TextFieldEditor"))).toBeNull();
    expect(refWidget(newField("DetailsEditor"))).toBeNull();
  });
});

describe("missingRequired", () => {
  it("flags only required fields that are empty", () => {
    const title = f({ id: "t", minCount: 1 });
    const desc = f({ id: "d", minCount: 0 });
    const issued = f({ id: "i", minCount: 1 });
    const missing = missingRequired([title, desc, issued], { t: "hi", i: "" });
    expect(missing.map((x) => x.id)).toEqual(["i"]);
  });

  it("treats booleans as always filled", () => {
    const b = f({ id: "b", minCount: 1, datatype: "xsd:boolean" });
    expect(missingRequired([b], { b: false })).toEqual([]);
  });

  it("isEmptyValue: blank/undefined empty, booleans not", () => {
    expect(isEmptyValue("")).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue("x")).toBe(false);
    expect(isEmptyValue(false)).toBe(false);
  });
});
