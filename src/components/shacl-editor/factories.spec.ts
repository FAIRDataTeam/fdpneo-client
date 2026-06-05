import { describe, expect, it } from "vitest";
import { autoPath, emptyDocument, newField, newGroup } from "./factories";
import { serializeSchema } from "./serialize";
import { parseSchema } from "./parse";

describe("factories", () => {
  it("autoPath slugifies a label into a :-prefixed name", () => {
    expect(autoPath("Text field")).toBe(":textfield");
    expect(autoPath("Access rights!")).toBe(":accessrights");
    expect(autoPath("")).toBe(":field");
  });

  it("newField seeds defaults from the widget catalog", () => {
    const f = newField("EnumSelectEditor");
    expect(f.editor).toBe("dash:EnumSelectEditor");
    expect(f.name).toBe("Enumeration");
    expect(f.path).toBe(":enumeration");
    expect(f.datatype).toBe("xsd:string");
    expect(f.inValues).toEqual(["Option A", "Option B"]);
  });

  it("newField copies inValues (no shared array between fields)", () => {
    const a = newField("EnumSelectEditor");
    const b = newField("EnumSelectEditor");
    a.inValues?.push("Extra");
    expect(b.inValues).toEqual(["Option A", "Option B"]);
  });

  it("mints unique ids across fields, groups, and documents", () => {
    const ids = [newField("URIEditor").id, newField("URIEditor").id, newGroup().id];
    expect(new Set(ids).size).toBe(3);
  });

  it("emptyDocument round-trips through serialize/parse", () => {
    const doc = emptyDocument();
    expect(() => parseSchema(serializeSchema(doc))).not.toThrow();
    const back = parseSchema(serializeSchema(doc));
    expect(back.shapes[0]?.shapeIri).toBe(":NewShape");
  });
});
