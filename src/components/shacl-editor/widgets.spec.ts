import { describe, expect, it } from "vitest";
import { WIDGETS, WIDGET_BY_ID, widgetForEditor } from "./widgets";

describe("widget catalog", () => {
  it("covers the 15 DASH editors plus the synthetic Number widget", () => {
    expect(WIDGETS).toHaveLength(16);
    const editors = new Set(WIDGETS.map((w) => w.editor));
    // The 15 distinct dash: editors (NumberFieldEditor shares TextFieldEditor).
    expect(editors.size).toBe(15);
    expect(editors).toContain("dash:AutoCompleteEditor");
    expect(editors).toContain("dash:BlankNodeEditor");
    expect(editors).toContain("dash:SubClassEditor");
    expect(editors).toContain("dash:TextFieldWithLangEditor");
  });

  it("has unique ids and an index that matches", () => {
    const ids = WIDGETS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(WIDGET_BY_ID).sort()).toEqual([...ids].sort());
  });

  it("each id equals its editor local name, except NumberFieldEditor", () => {
    for (const w of WIDGETS) {
      if (w.id === "NumberFieldEditor") continue;
      expect(w.editor).toBe(`dash:${w.id}`);
    }
  });

  it("widgetForEditor maps editor IRIs back to ids", () => {
    expect(widgetForEditor("dash:EnumSelectEditor", null)).toBe("EnumSelectEditor");
    expect(widgetForEditor("dash:URIEditor", null)).toBe("URIEditor");
    expect(widgetForEditor("dash:TextFieldEditor", "xsd:string")).toBe("TextFieldEditor");
    expect(widgetForEditor("dash:TextFieldEditor", "xsd:integer")).toBe("NumberFieldEditor");
    expect(widgetForEditor(null, null)).toBe("");
  });

  it("round-trips every widget through widgetForEditor (datatype-aware)", () => {
    for (const w of WIDGETS) {
      expect(widgetForEditor(w.editor, w.defaults.datatype ?? null)).toBe(w.id);
    }
  });
});
