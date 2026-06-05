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
import { computed, ref } from "vue";
import type { ShapeGraph } from "@/components/shacl-editor/graph";
import type { SchemaDocument } from "@/components/shacl-editor/model";
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

  // --- Undo/redo (4.5): a snapshot stack of model documents. The view records
  // the pre-edit document on every Visual Editor change and asks to step back
  // or forward; snapshots are immutable (mutations always clone). ---
  const past = ref<SchemaDocument[]>([]);
  const future = ref<SchemaDocument[]>([]);
  const HISTORY_LIMIT = 100;

  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  /** Record the document as it was *before* an edit; clears the redo stack. */
  function record(prev: SchemaDocument) {
    past.value.push(prev);
    if (past.value.length > HISTORY_LIMIT) past.value.shift();
    future.value = [];
  }
  /** Step back: returns the previous document (and stashes `current` for redo), or null. */
  function undo(current: SchemaDocument): SchemaDocument | null {
    const prev = past.value.pop();
    if (!prev) return null;
    future.value.push(current);
    return prev;
  }
  /** Step forward: returns the next document (and stashes `current` for undo), or null. */
  function redo(current: SchemaDocument): SchemaDocument | null {
    const next = future.value.pop();
    if (!next) return null;
    past.value.push(current);
    return next;
  }
  function resetHistory() {
    past.value = [];
    future.value = [];
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
      const key = node.key;
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
    resetHistory();
  }

  return {
    positions,
    selectedIri,
    violations,
    canUndo,
    canRedo,
    setPosition,
    select,
    ensureLayout,
    setViolations,
    clearViolations,
    record,
    undo,
    redo,
    resetHistory,
    reset,
  };
});
