/**
 * Visual SHACL editor UI state (Phase 4, task 4.1).
 *
 * Holds canvas state that is NOT part of the schema: node positions and the
 * selected shape. Keyed by `shapeIri` (stable across re-parse) rather than the
 * client-only `id` (regenerated every parse), so a steward's layout survives
 * edits in the SHACL tab. In-memory only, per CLAUDE.md — positions are not
 * persisted to the schema (the Turtle is the source of truth).
 */

import { defineStore } from "pinia";
import { ref } from "vue";
import type { ShapeGraph } from "@/components/shacl-editor/graph";
import type { SchemaViolation } from "@/api/schemas";

export interface XY {
  x: number;
  y: number;
}

/** Grid layout constants for auto-placing not-yet-positioned shapes. */
const COL_WIDTH = 280;
const ROW_HEIGHT = 200;
const COLS = 3;
const MARGIN = 40;

export const useShaclEditorStore = defineStore("shaclEditor", () => {
  // Positions keyed by shapeIri (stable); UI-only, never serialized.
  const positions = ref<Record<string, XY>>({});
  const selectedIri = ref<string | null>(null);
  // Latest server validation violations, surfaced as canvas annotations (4.4).
  const violations = ref<SchemaViolation[]>([]);

  function setViolations(v: SchemaViolation[]) {
    violations.value = v;
  }
  function clearViolations() {
    violations.value = [];
  }

  function setPosition(iri: string, pos: XY) {
    positions.value[iri] = pos;
  }

  function select(iri: string | null) {
    selectedIri.value = iri;
  }

  /**
   * Assign a grid position to every node in the graph that doesn't have one
   * yet; existing positions (dragged by the user) are left untouched. Returns
   * the count of newly-placed nodes.
   */
  function ensureLayout(graph: ShapeGraph): number {
    let placed = 0;
    graph.nodes.forEach((node, i) => {
      const key = node.shapeIri;
      if (!key || positions.value[key]) return;
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      positions.value[key] = {
        x: MARGIN + col * COL_WIDTH,
        y: MARGIN + row * ROW_HEIGHT,
      };
      placed += 1;
    });
    return placed;
  }

  /** Forget positions/selection (e.g. when switching to a different schema). */
  function reset() {
    positions.value = {};
    selectedIri.value = null;
    violations.value = [];
  }

  return {
    positions,
    selectedIri,
    violations,
    setPosition,
    select,
    ensureLayout,
    setViolations,
    clearViolations,
    reset,
  };
});
