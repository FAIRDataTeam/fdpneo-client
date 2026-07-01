// Adapted from Contour (sibling repo) @ 4117ff2 — SHACL engine ported into the FDP client.
// First-class client code (held to the full strict config); Contour remains a separate project.
import { reactive, readonly, ref, toRaw } from 'vue';
import { blankSchema, newId } from '../data';
import type { Field, Mutator, Schema, Widget } from '../types';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// Start from a blank schema so users build their own from scratch.
const _schema = reactive<Schema>(blankSchema());

// ── Undo / redo history ──────────────────────────────────────────────────────
// Each entry is a full schema snapshot. The store already clones on every
// mutation, so keeping snapshots is cheap and the simplest correct design.
const _undo: Schema[] = [];
const _redo: Schema[] = [];
const HISTORY_LIMIT = 100;
const COALESCE_MS = 600;
const canUndo = ref(false);
const canRedo = ref(false);
let lastCoalesceKey: string | null = null;
let lastMutateAt = 0;

function snapshot(): Schema {
  return deepClone(toRaw(_schema));
}
function syncFlags() {
  canUndo.value = _undo.length > 0;
  canRedo.value = _redo.length > 0;
}

export function fieldFromWidget(widget: Widget, order = 0): Field {
  const f: Field = {
    id: newId('f'),
    widgetId: widget.id,
    name: widget.name,
    description: '',
    // Default path: local name derived from widget name; user is expected to replace it.
    path: ':' + widget.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    order,
    nodeKind: widget.defaults.nodeKind ?? null,
    datatype: widget.defaults.datatype ?? null,
    class: widget.defaults.class ?? null,
    node: null,
    minCount: null,
    maxCount: null,
    minLength: null,
    maxLength: null,
    pattern: '',
    defaultValue: '',
    inValues: widget.defaults.inValues ? widget.defaults.inValues.map((v) => ({ ...v })) : null,
  };
  return f;
}

export function useSchemaStore() {
  /**
   * Apply an immutable mutation. Pass a `coalesceKey` to merge a run of rapid
   * same-key edits (e.g. typing in one field) into a single undo step.
   */
  function mutate(mut: Mutator, coalesceKey?: string) {
    const now = Date.now();
    const coalesce =
      coalesceKey != null &&
      coalesceKey === lastCoalesceKey &&
      now - lastMutateAt < COALESCE_MS;

    if (!coalesce) {
      _undo.push(snapshot());
      if (_undo.length > HISTORY_LIMIT) _undo.shift();
      _redo.length = 0;
    }
    lastCoalesceKey = coalesceKey ?? null;
    lastMutateAt = now;

    // Clone → mutate → assign: keeps _schema reactive while giving callers
    // a plain-object draft they can freely modify without Vue tracking overhead.
    const draft = deepClone(toRaw(_schema));
    mut(draft);
    Object.assign(_schema, draft);
    syncFlags();
  }

  function undo() {
    if (!_undo.length) return;
    _redo.push(snapshot());
    Object.assign(_schema, _undo.pop()!);
    lastCoalesceKey = null;
    syncFlags();
  }

  function redo() {
    if (!_redo.length) return;
    _undo.push(snapshot());
    Object.assign(_schema, _redo.pop()!);
    lastCoalesceKey = null;
    syncFlags();
  }

  return {
    schema: readonly(_schema) as unknown as Schema,
    mutate,
    undo,
    redo,
    canUndo: readonly(canUndo),
    canRedo: readonly(canRedo),
  };
}