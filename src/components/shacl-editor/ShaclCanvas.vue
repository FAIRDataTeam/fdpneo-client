<script setup lang="ts">
/**
 * Vue Flow shape-graph overview (Phase 4, task 4.1).
 *
 * Renders every `sh:NodeShape` in the document as a draggable node and the
 * `sh:node`/`sh:class` links between them as edges. Node positions and the
 * selected shape are UI-only state in the `shaclEditor` store (keyed by stable
 * `shapeIri`), never written back to the schema. Selecting a node will later
 * drill into that shape's form designer (4.2); for now it emits `select`.
 */
import { computed, ref, watch } from "vue";
import { VueFlow, type Edge, type Node, type NodeDragEvent, type NodeMouseEvent } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import { useShaclEditorStore } from "@/stores/shaclEditor";
import { useResourceTypes } from "@/composables/useResourceTypes";
import { compactIri } from "@/rdf/namespaces";
import { buildShapeGraph, type ResourceTypeLike, type ShapeNode } from "./graph";
import { shapeViolationCounts } from "./violations";
import type { SchemaDocument } from "./model";
import ShapeNodeCard from "./ShapeNodeCard.vue";

const props = defineProps<{ doc: SchemaDocument }>();
const emit = defineEmits<{ (e: "select", shapeIri: string | null): void }>();

const store = useShaclEditorStore();
const { defs, specFor } = useResourceTypes();
const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
// Per-shape count of violating fields, for the node badge (4.4).
const violByShape = computed(() => shapeViolationCounts(props.doc, store.violations));

// Registered resource types → ghost-node seeds (4.1): types with no shape here.
const types = computed<ResourceTypeLike[]>(() =>
  defs.value
    .map((d) => specFor(d.urlPrefix))
    .filter((s): s is NonNullable<typeof s> => s !== null)
    // resource-type class IRIs are full; the model's targetClass is prefixed.
    .map((s) => ({ classIri: compactIri(s.classIri, props.doc.prefixes), label: s.label })),
);

function rebuild() {
  const g = buildShapeGraph(props.doc, types.value);
  store.ensureLayout(g);
  // Build plain objects, then cast: assigning the literal straight to a
  // `ref<Node[]>` makes TS instantiate Vue Flow's deeply-generic `Node` type
  // against it (TS2589). The local infers structurally, the cast asserts.
  const ns = g.nodes.map((n) => ({
    id: n.key,
    type: "shapecard",
    position: store.positions[n.key] ?? { x: 0, y: 0 },
    data: n,
    selected: store.selectedIri === n.key,
    selectable: !n.ghost,
    draggable: true,
  }));
  const es = g.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.via,
    animated: e.kind === "node",
  }));
  nodes.value = ns as Node[];
  edges.value = es as Edge[];
}

watch([() => props.doc, types], rebuild, { immediate: true, deep: true });

function onDragStop({ node }: NodeDragEvent) {
  store.setPosition(node.id, { x: node.position.x, y: node.position.y });
}
function onNodeClick({ node }: NodeMouseEvent) {
  if ((node.data as ShapeNode | undefined)?.ghost) return; // ghosts aren't editable
  activate(node.id);
}
// Keyboard activation (Enter/Space on a focused node) — same as a click.
function activate(shapeIri: string) {
  store.select(shapeIri);
  emit("select", shapeIri);
}
function onPaneClick() {
  store.select(null);
  emit("select", null);
}
</script>

<template>
  <div class="canvas" role="group" aria-label="Shape graph — Tab to a shape, Enter to edit it">
    <p v-if="!nodes.length" class="empty">
      No shapes yet — add a <code class="mono">sh:NodeShape</code> in the SHACL tab.
    </p>
    <VueFlow
      v-else
      v-model:nodes="nodes"
      v-model:edges="edges"
      :min-zoom="0.3"
      :max-zoom="1.5"
      fit-view-on-init
      @node-drag-stop="onDragStop"
      @node-click="onNodeClick"
      @pane-click="onPaneClick"
    >
      <Background :gap="16" />
      <Controls />
      <template #node-shapecard="slotProps">
        <ShapeNodeCard
          :data="slotProps.data"
          :selected="slotProps.selected"
          :violations="violByShape.get(slotProps.id) ?? 0"
          @activate="activate(slotProps.id)"
        />
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.canvas {
  height: 560px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--paper);
  overflow: hidden;
}
.empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 13px;
}
</style>
