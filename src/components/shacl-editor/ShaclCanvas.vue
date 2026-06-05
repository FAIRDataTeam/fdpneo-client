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
import { ref, watch } from "vue";
import { VueFlow, type Edge, type Node, type NodeDragEvent, type NodeMouseEvent } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import { useShaclEditorStore } from "@/stores/shaclEditor";
import { buildShapeGraph } from "./graph";
import type { SchemaDocument } from "./model";
import ShapeNodeCard from "./ShapeNodeCard.vue";

const props = defineProps<{ doc: SchemaDocument }>();
const emit = defineEmits<{ (e: "select", shapeIri: string | null): void }>();

const store = useShaclEditorStore();
const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);

function rebuild() {
  const g = buildShapeGraph(props.doc);
  store.ensureLayout(g);
  const idToIri = new Map(g.nodes.map((n) => [n.id, n.shapeIri]));
  // Build plain objects, then cast: assigning the literal straight to a
  // `ref<Node[]>` makes TS instantiate Vue Flow's deeply-generic `Node` type
  // against it (TS2589). The local infers structurally, the cast asserts.
  const ns = g.nodes.map((n) => ({
    id: n.shapeIri,
    type: "shapecard",
    position: store.positions[n.shapeIri] ?? { x: 0, y: 0 },
    data: n,
    selected: store.selectedIri === n.shapeIri,
  }));
  const es = g.edges.map((e) => ({
    id: e.id,
    source: idToIri.get(e.source) ?? e.source,
    target: idToIri.get(e.target) ?? e.target,
    label: e.via,
    animated: e.kind === "node",
  }));
  nodes.value = ns as Node[];
  edges.value = es as Edge[];
}

watch(() => props.doc, rebuild, { immediate: true, deep: true });

function onDragStop({ node }: NodeDragEvent) {
  store.setPosition(node.id, { x: node.position.x, y: node.position.y });
}
function onNodeClick({ node }: NodeMouseEvent) {
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
