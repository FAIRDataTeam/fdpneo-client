import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useShaclEditorStore } from "./shaclEditor";
import type { ShapeGraph } from "@/components/shacl-editor/graph";
import type { SchemaDocument } from "@/components/shacl-editor/model";

function graph(iris: string[]): ShapeGraph {
  return {
    nodes: iris.map((shapeIri, i) => ({
      id: `s${i}`,
      shapeIri,
      label: shapeIri,
      targetClass: "",
      propertyCount: 0,
    })),
    edges: [],
  };
}

describe("shaclEditor store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("auto-lays-out only nodes without a position", () => {
    const s = useShaclEditorStore();
    s.setPosition(":A", { x: 5, y: 5 });
    const placed = s.ensureLayout(graph([":A", ":B", ":C"]));
    expect(placed).toBe(2); // :A already placed
    expect(s.positions[":A"]).toEqual({ x: 5, y: 5 }); // untouched
    expect(s.positions[":B"]).toBeTruthy();
    expect(s.positions[":C"]).toBeTruthy();
  });

  it("is idempotent — re-running layout places nothing new", () => {
    const s = useShaclEditorStore();
    const g = graph([":A", ":B"]);
    expect(s.ensureLayout(g)).toBe(2);
    expect(s.ensureLayout(g)).toBe(0);
  });

  it("tracks selection and resets", () => {
    const s = useShaclEditorStore();
    s.select(":A");
    expect(s.selectedIri).toBe(":A");
    s.setPosition(":A", { x: 1, y: 2 });
    s.reset();
    expect(s.selectedIri).toBeNull();
    expect(s.positions).toEqual({});
  });

  // Snapshots come back as reactive proxies (deep-equal, not ===), so assert on
  // a marker (shape id) rather than reference identity.
  const doc = (tag: string) => ({ prefixes: [], shapes: [{ id: tag }] }) as unknown as SchemaDocument;

  it("undo/redo steps through recorded snapshots", () => {
    const s = useShaclEditorStore();
    const v0 = doc("v0"), v1 = doc("v1"), v2 = doc("v2");

    expect(s.canUndo).toBe(false);
    s.record(v0); // edit v0 -> v1
    s.record(v1); // edit v1 -> v2 (current is v2)
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);

    expect(s.undo(v2)?.shapes[0]?.id).toBe("v1");
    expect(s.undo(v1)?.shapes[0]?.id).toBe("v0");
    expect(s.undo(v0)).toBeNull();
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(true);

    expect(s.redo(v0)?.shapes[0]?.id).toBe("v1");
    expect(s.redo(v1)?.shapes[0]?.id).toBe("v2");
    expect(s.redo(v2)).toBeNull();
  });

  it("recording a new edit clears the redo stack", () => {
    const s = useShaclEditorStore();
    s.record(doc("a"));
    s.undo(doc("b")); // now redo available
    expect(s.canRedo).toBe(true);
    s.record(doc("c")); // a fresh edit discards the redo branch
    expect(s.canRedo).toBe(false);
  });
});
