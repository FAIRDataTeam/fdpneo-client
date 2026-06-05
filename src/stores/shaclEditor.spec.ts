import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useShaclEditorStore } from "./shaclEditor";
import type { ShapeGraph } from "@/components/shacl-editor/graph";

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
});
