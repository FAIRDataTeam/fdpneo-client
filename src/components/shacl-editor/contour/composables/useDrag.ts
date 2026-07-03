// Adapted from Contour (sibling repo) @ 4117ff2 — SHACL engine ported into the FDP client.
// First-class client code (held to the full strict config); Contour remains a separate project.
import { reactive } from 'vue';
import type { Widget } from '../types';

export type DragPayload =
  | { type: 'palette'; widget: Widget }
  | { type: 'field'; fieldId: string; fromGroup: string; fromNestedShape?: string }
  | null;

export interface HoverTarget {
  groupId: string;
  fieldId: string | null;
  position: 'before' | 'after' | 'end';
  isNested?: boolean;
}

interface DragState {
  payload: DragPayload;
  hover: HoverTarget | null;
}

// Stable MIME types stamped on every drag so drop zones can identify ours
// without relying on reactive state propagation across components.
export const DT_WIDGET = 'application/x-shacl-widget';
export const DT_FIELD  = 'application/x-shacl-field';

const state = reactive<DragState>({
  payload: null,
  hover: null,
});

export function useDrag() {
  function startPaletteDrag(e: DragEvent, widget: Widget) {
    state.payload = { type: 'palette', widget };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData(DT_WIDGET, widget.id);
      e.dataTransfer.setData('text/plain', widget.id);
    }
  }

  function startFieldDrag(e: DragEvent, fieldId: string, fromGroup: string) {
    state.payload = { type: 'field', fieldId, fromGroup };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(DT_FIELD, fieldId);
      e.dataTransfer.setData('text/plain', fieldId);
    }
  }

  function startNestedFieldDrag(e: DragEvent, fieldId: string, fromNestedShape: string) {
    state.payload = { type: 'field', fieldId, fromGroup: '', fromNestedShape };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(DT_FIELD, fieldId);
      e.dataTransfer.setData('text/plain', fieldId);
    }
  }

  function endDrag() {
    state.payload = null;
    state.hover = null;
  }

  function setHover(target: HoverTarget | null) {
    state.hover = target;
  }

  /** Returns true when the drag event carries one of our custom types. */
  function isOurDrag(e: DragEvent): boolean {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    return types.includes(DT_WIDGET) || types.includes(DT_FIELD);
  }

  return {
    state,
    startPaletteDrag,
    startFieldDrag,
    startNestedFieldDrag,
    endDrag,
    setHover,
    isOurDrag,
  };
}