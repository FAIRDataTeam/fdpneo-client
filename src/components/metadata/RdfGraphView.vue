<script setup lang="ts">
/**
 * Live RDF graph — the "Living specimen plate" (interface note #28, redesigned).
 *
 * An instance-focused node-link graph of the record's RDF. The focused record is
 * centred; two independent layers can be toggled:
 *   • Relations  — links to other FDP records (the structure/hierarchy): typed,
 *                  refocusable nodes with solid labelled arrows.
 *   • Attributes — the record's own properties (literals + vocabulary IRIs):
 *                  "specimen tags" of predicate → value on dashed leaders.
 * Click a record node to refocus + expand (its Turtle is fetched + cached). Wheel
 * to zoom, drag the canvas to pan, drag a node to pin, hover to spotlight.
 *
 * Layout is a compact hand-rolled force simulation in SVG (no graph dependency;
 * n3 parses, the `--t-*` tokens colour by record kind). The data split lives in
 * `graphModel.ts`; this component owns layout + interaction.
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { iriToId } from "@/api/rdf";
import { useRecordTurtle } from "@/composables/useRecord";
import { neighbourhood, type GraphAttr, type GraphEdge, type GraphRecordNode } from "./graphModel";
import AppIcon from "@/components/shared/AppIcon.vue";

const { t } = useI18n();

const props = defineProps<{ recordId: string; subjectIri: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

// ── focus + layers ────────────────────────────────────────────────────────────
const focus = ref(props.subjectIri);
const history = ref<string[]>([]);
const showRel = ref(true);
const showAttr = ref(true);
const hoverId = ref<string | null>(null);

const focusPath = computed(() => iriToId(focus.value));
const { data: turtle, isFetching, isError } = useRecordTurtle(focusPath);

const model = computed(() =>
  turtle.value
    ? neighbourhood(turtle.value, focus.value)
    : { recordNodes: [] as GraphRecordNode[], attrs: [] as GraphAttr[], edges: [] as GraphEdge[] },
);
const focusNode = computed(() => model.value.recordNodes.find((n) => n.focus) ?? null);
const visNodes = computed(() =>
  showRel.value ? model.value.recordNodes : model.value.recordNodes.filter((n) => n.focus),
);
const visAttrs = computed(() => (showAttr.value ? model.value.attrs : []));
const liveIds = computed(
  () => new Set([...visNodes.value.map((n) => n.id), ...visAttrs.value.map((a) => a.id)]),
);
const visEdges = computed(() =>
  model.value.edges.filter((e) => {
    if (e.kind === "rel" && !showRel.value) return false;
    if (e.kind === "attr" && !showAttr.value) return false;
    return liveIds.value.has(e.s) && liveIds.value.has(e.o);
  }),
);

// ── layout state ────────────────────────────────────────────────────────────
interface P { x: number; y: number; vx: number; vy: number; pinned: boolean }
const pos = reactive<Record<string, P>>({});
const view = reactive({ x: 0, y: 0, w: 1000, h: 640 });
const svgRef = ref<SVGSVGElement | null>(null);
let alpha = 1;
let raf = 0;
const reduceMotion =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const radius = (id: string) =>
  id === focus.value ? 30 : model.value.recordNodes.some((n) => n.id === id) ? 20 : 4;
/** Node transform, or undefined before its position is seeded. */
function xf(id: string): string | undefined {
  const p = pos[id];
  return p ? `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})` : undefined;
}

function seed() {
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;
  const all = [...visNodes.value, ...visAttrs.value];
  const ring = all.filter((n) => n.id !== focus.value);
  ring.forEach((n, i) => {
    if (!pos[n.id]) {
      const a = (i / Math.max(1, ring.length)) * Math.PI * 2 - Math.PI / 2;
      const rad = "pred" in n ? 150 : 240;
      pos[n.id] = { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad, vx: 0, vy: 0, pinned: false };
    }
  });
  if (!pos[focus.value]) pos[focus.value] = { x: cx, y: cy, vx: 0, vy: 0, pinned: false };
  const live = new Set(all.map((n) => n.id));
  for (const k of Object.keys(pos)) if (!live.has(k)) delete pos[k];
  alpha = 1;
  if (reduceMotion) { for (let i = 0; i < 240; i++) step(); fit(); }
}

function step() {
  const all = [...visNodes.value, ...visAttrs.value];
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;
  for (let i = 0; i < all.length; i++) {
    const a = pos[all[i]!.id];
    if (!a) continue;
    for (let j = i + 1; j < all.length; j++) {
      const b = pos[all[j]!.id];
      if (!b) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy || 1, d = Math.sqrt(d2);
      const rep = 9000 / d2, fx = (dx / d) * rep, fy = (dy / d) * rep;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  for (const e of visEdges.value) {
    const a = pos[e.s], b = pos[e.o];
    if (!a || !b) continue;
    const L = e.kind === "attr" ? 120 : 180;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const f = (d - L) * 0.035, fx = (dx / d) * f, fy = (dy / d) * f;
    if (e.s !== focus.value) { a.vx += fx; a.vy += fy; }
    if (e.o !== focus.value) { b.vx -= fx; b.vy -= fy; }
  }
  for (const n of all) {
    const p = pos[n.id];
    if (!p) continue;
    if (n.id === focus.value && !p.pinned) { p.x += (cx - p.x) * 0.12; p.y += (cy - p.y) * 0.12; p.vx = 0; p.vy = 0; continue; }
    p.vx += (cx - p.x) * 0.003; p.vy += (cy - p.y) * 0.003;
    if (p.pinned) { p.vx = 0; p.vy = 0; continue; }
    p.vx *= 0.82; p.vy *= 0.82; p.x += p.vx * alpha; p.y += p.vy * alpha;
  }
  alpha *= 0.985; if (alpha < 0.02) alpha = 0.02;
}

function loop() { step(); raf = requestAnimationFrame(loop); }

// ── geometry helpers (read reactive pos so bindings re-evaluate per frame) ────
function edgePath(e: GraphEdge): string {
  const a = pos[e.s], b = pos[e.o];
  if (!a || !b) return "";
  const ra = radius(e.s) + 3;
  const rb = e.kind === "attr" ? 2 : radius(e.o) + 6;
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  const ax = a.x + (dx / d) * ra, ay = a.y + (dy / d) * ra;
  const bx = b.x - (dx / d) * rb, by = b.y - (dy / d) * rb;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const curve = e.kind === "attr" ? 10 : 22, nx = (-dy / d) * curve, ny = (dx / d) * curve;
  return `M${ax.toFixed(1)},${ay.toFixed(1)} Q${(mx + nx).toFixed(1)},${(my + ny).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`;
}
function labelXY(e: GraphEdge): { x: number; y: number } {
  const a = pos[e.s], b = pos[e.o];
  if (!a || !b) return { x: 0, y: 0 };
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  return { x: (a.x + b.x) / 2 + (-dy / d) * 14, y: (a.y + b.y) / 2 + (dx / d) * 14 };
}
const tagW = (a: GraphAttr) =>
  Math.min(240, Math.max(70, Math.max(a.predLabel.length, Math.min(a.value.length, 28)) * 7 + 20));
const dimmed = (id: string) => {
  if (!hoverId.value) return false;
  if (id === hoverId.value) return false;
  return !visEdges.value.some((e) => (e.s === hoverId.value && e.o === id) || (e.o === hoverId.value && e.s === id));
};
const edgeHot = (e: GraphEdge) => hoverId.value !== null && (e.s === hoverId.value || e.o === hoverId.value);

// ── interaction: zoom / pan / drag / refocus ──────────────────────────────────
function toWorld(ev: PointerEvent | WheelEvent) {
  const r = svgRef.value!.getBoundingClientRect();
  return { x: view.x + ((ev.clientX - r.left) / r.width) * view.w, y: view.y + ((ev.clientY - r.top) / r.height) * view.h };
}
let dragId: string | null = null;
let dragMoved = false;
let dragOff = { x: 0, y: 0 };
let pan: { mx: number; my: number; vx: number; vy: number } | null = null;

function onNodeDown(ev: PointerEvent, id: string) {
  ev.stopPropagation();
  dragId = id; dragMoved = false;
  const w = toWorld(ev), p = pos[id]!;
  dragOff = { x: w.x - p.x, y: w.y - p.y };
  svgRef.value?.setPointerCapture(ev.pointerId);
}
function onCanvasDown(ev: PointerEvent) {
  if (dragId) return;
  pan = { mx: ev.clientX, my: ev.clientY, vx: view.x, vy: view.y };
  svgRef.value?.setPointerCapture(ev.pointerId);
}
function onMove(ev: PointerEvent) {
  if (dragId) {
    const w = toWorld(ev), p = pos[dragId];
    if (!p) return;
    p.x = w.x - dragOff.x; p.y = w.y - dragOff.y; p.pinned = true; p.vx = 0; p.vy = 0;
    dragMoved = true; alpha = Math.max(alpha, 0.4); return;
  }
  if (pan) {
    const r = svgRef.value!.getBoundingClientRect();
    view.x = pan.vx - ((ev.clientX - pan.mx) / r.width) * view.w;
    view.y = pan.vy - ((ev.clientY - pan.my) / r.height) * view.h;
  }
}
function onUp() { dragId = null; pan = null; }
function onWheel(ev: WheelEvent) {
  ev.preventDefault();
  const w = toWorld(ev), k = ev.deltaY > 0 ? 1.12 : 0.89;
  const nw = Math.min(3200, Math.max(260, view.w * k)), nh = nw * (view.h / view.w);
  view.x = w.x - (w.x - view.x) * (nw / view.w); view.y = w.y - (w.y - view.y) * (nh / view.h);
  view.w = nw; view.h = nh;
}
function zoom(k: number) {
  const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
  view.w *= k; view.h *= k; view.x = cx - view.w / 2; view.y = cy - view.h / 2;
}
function fit() {
  const ps = [...visNodes.value, ...visAttrs.value].map((n) => pos[n.id]).filter(Boolean) as P[];
  if (!ps.length || !svgRef.value) return;
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const p of ps) { minx = Math.min(minx, p.x); miny = Math.min(miny, p.y); maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y); }
  const pad = 140, w = Math.max(360, maxx - minx + pad * 2), h = Math.max(260, maxy - miny + pad * 2);
  const ar = svgRef.value.clientWidth / svgRef.value.clientHeight || 1.6;
  let vw = w, vh = h;
  if (w / h > ar) vh = w / ar; else vw = h * ar;
  view.x = (minx + maxx) / 2 - vw / 2; view.y = (miny + maxy) / 2 - vh / 2; view.w = vw; view.h = vh;
}

function refocus(node: GraphRecordNode) {
  if (dragMoved || node.focus) return;
  history.value.push(focus.value);
  focus.value = node.iri;
}
function back() {
  const prev = history.value.pop();
  if (prev) focus.value = prev;
}

// reseed when the visible set changes (focus change, toggles)
watch([visNodes, visAttrs], () => seed(), { flush: "post" });

onMounted(() => {
  if (svgRef.value) { view.w = svgRef.value.clientWidth || 1000; view.h = svgRef.value.clientHeight || 640; }
  seed(); fit();
  if (!reduceMotion && typeof requestAnimationFrame !== "undefined") loop();
});
onUnmounted(() => {
  if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
});

const viewBox = computed(() => `${view.x} ${view.y} ${view.w} ${view.h}`);
</script>

<template>
  <div class="graph-shell">
    <header class="gbar">
      <div class="ftitle-wrap">
        <div class="eyebrow mono">{{ t("rdfGraph.eyebrow") }}</div>
        <div class="ftitle">{{ focusNode?.label ?? (isFetching ? t("rdfGraph.loading") : t("rdfGraph.graphFallback")) }}</div>
        <div class="firi mono">{{ focus }}</div>
      </div>
      <div class="spacer" />
      <div class="layers">
        <button class="toggle rel" :class="{ on: showRel }" :aria-pressed="showRel" @click="showRel = !showRel">
          <span class="dotk" /> {{ t("rdfGraph.relations") }} <span class="sw" />
        </button>
        <button class="toggle attr" :class="{ on: showAttr }" :aria-pressed="showAttr" @click="showAttr = !showAttr">
          <span class="dotk" /> {{ t("rdfGraph.attributes") }} <span class="sw" />
        </button>
      </div>
      <button v-if="history.length" class="btn sm" @click="back"><AppIcon name="arrow-r" :size="12" style="transform:rotate(180deg)" /> {{ t("rdfGraph.back") }}</button>
      <button class="btn sm iconbtn" :aria-label="t('rdfGraph.zoomIn')" @click="zoom(0.8)">+</button>
      <button class="btn sm iconbtn" :aria-label="t('rdfGraph.zoomOut')" @click="zoom(1.25)">−</button>
      <button class="btn sm" @click="fit">{{ t("rdfGraph.fit") }}</button>
      <button class="btn sm iconbtn" :aria-label="t('rdfGraph.closeGraph')" @click="emit('close')"><AppIcon name="x" :size="14" /></button>
    </header>

    <div class="canvas-wrap">
      <p v-if="isError" class="empty">{{ t("rdfGraph.loadError") }}</p>
      <svg
        ref="svgRef" class="canvas" :viewBox="viewBox" role="group" :aria-label="t('rdfGraph.recordGraphAria')"
        @pointerdown="onCanvasDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" @wheel="onWheel"
      >
        <defs>
          <marker id="g-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--fair-border)" />
          </marker>
          <marker id="g-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--tool-accent)" />
          </marker>
        </defs>

        <!-- edges -->
        <path
          v-for="(e, i) in visEdges" :key="`e${i}`"
          class="edge" :class="{ attr: e.kind === 'attr', hot: edgeHot(e), dim: hoverId && !edgeHot(e) }"
          :d="edgePath(e)" :marker-end="e.kind === 'rel' ? (edgeHot(e) ? 'url(#g-arrow-hot)' : 'url(#g-arrow)') : undefined"
        />
        <!-- rel edge labels -->
        <text
          v-for="(e, i) in visEdges.filter((x) => x.kind === 'rel')" :key="`l${i}`"
          class="edge-label" :class="{ hot: edgeHot(e), dim: hoverId && !edgeHot(e) }"
          text-anchor="middle" :x="labelXY(e).x" :y="labelXY(e).y"
        >{{ e.predLabel }}</text>

        <!-- attribute specimen tags -->
        <g
          v-for="a in visAttrs" :key="a.id" class="attrtag" :class="[a.isIri ? 'iri' : 'lit', { dim: dimmed(a.id) }]"
          :transform="xf(a.id)"
        >
          <rect rx="7" height="34" :width="tagW(a)" :x="-tagW(a) / 2" y="-17" />
          <text class="apred" :x="-tagW(a) / 2 + 10" y="-7">{{ a.predLabel }}</text>
          <text class="aval" :x="-tagW(a) / 2 + 10" y="8">{{ a.value.length > 28 ? a.value.slice(0, 27) + "…" : a.value }}</text>
        </g>

        <!-- record nodes -->
        <g
          v-for="n in visNodes" :key="n.id" class="node" :class="{ focus: n.focus, dim: dimmed(n.id) }"
          :style="{ '--c': `var(--t-${n.type})`, '--c-soft': `color-mix(in srgb, var(--t-${n.type}) 16%, transparent)` }"
          :transform="xf(n.id)"
          @pointerenter="hoverId = n.id" @pointerleave="hoverId = null"
          @pointerdown="onNodeDown($event, n.id)" @click="refocus(n)"
        >
          <circle class="halo" :r="(n.focus ? 30 : 20) + 10" />
          <circle class="disc" :r="n.focus ? 30 : 20" />
          <text class="glyph">{{ n.type.slice(0, 3) }}</text>
          <text class="nlabel" :y="(n.focus ? 30 : 20) + 16">{{ n.label.length > 30 ? n.label.slice(0, 29) + "…" : n.label }}</text>
        </g>
      </svg>

      <div class="legend">
        <h4>{{ t("rdfGraph.legendRecords") }}</h4>
        <div class="lrow"><span class="sw-rec" style="color:var(--t-fdp)" /> Repository</div>
        <div class="lrow"><span class="sw-rec" style="color:var(--t-catalog)" /> Catalog</div>
        <div class="lrow"><span class="sw-rec" style="color:var(--t-dataset)" /> Dataset</div>
        <div class="lrow"><span class="sw-rec" style="color:var(--t-distribution)" /> Distribution</div>
        <h4>{{ t("rdfGraph.legendAttributes") }}</h4>
        <div class="lrow"><span class="sw-tag" /> {{ t("rdfGraph.legendPropertyValue") }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.graph-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.gbar {
  display: flex; align-items: center; gap: 10px; padding: 12px 18px; flex: none;
  border-bottom: 1px solid var(--fair-separator); background: var(--fair-surface);
}
.ftitle-wrap { min-width: 0; }
.eyebrow { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--fair-text-muted); }
.ftitle { font-family: var(--fair-font-sans); font-weight: 500; font-size: 19px; line-height: 1.1; color: var(--fair-text-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 42ch; }
.firi { font-size: 11px; color: var(--fair-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 42ch; }
.spacer { flex: 1; }
.layers { display: flex; gap: 8px; margin-right: 6px; }
.toggle {
  display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border-radius: 9px; cursor: pointer;
  font-family: var(--fair-font-sans); font-size: 12px; font-weight: 600; color: var(--fair-text-muted);
  background: var(--fair-surface); border: 1px solid var(--fair-border);
}
.toggle .sw { width: 28px; height: 15px; border-radius: 999px; background: var(--fair-border); position: relative; flex: none; transition: background 0.2s; }
.toggle .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%; background: var(--fair-surface); transition: transform 0.2s; }
.toggle .dotk { width: 9px; height: 9px; border-radius: 3px; flex: none; }
.toggle.rel .dotk { background: var(--tool-accent); }
.toggle.attr .dotk { background: var(--fair-warning); }
.toggle.on { color: var(--fair-text-strong); }
.toggle.on.rel { border-color: var(--fair-node-soft); }
.toggle.on.rel .sw { background: var(--tool-accent); }
.toggle.on.attr { border-color: color-mix(in srgb, var(--fair-warning) 45%, var(--fair-border)); }
.toggle.on.attr .sw { background: var(--fair-warning); }
.toggle.on .sw::after { transform: translateX(13px); }
.iconbtn { width: 32px; padding: 0; justify-content: center; }

.canvas-wrap { position: relative; flex: 1; min-height: 0; background: var(--fair-bg); }
.canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; touch-action: none; }
.canvas:active { cursor: grabbing; }

.edge { fill: none; stroke: var(--fair-border); stroke-width: 1.4; transition: stroke 0.2s, opacity 0.2s; }
.edge.attr { stroke-width: 1.1; stroke-dasharray: 2 4; opacity: 0.85; }
.edge.hot { stroke: var(--tool-accent); stroke-width: 2; }
.edge.dim { opacity: 0.14; }
.edge-label { font-family: var(--fair-font-mono); font-size: 10px; fill: var(--fair-text-muted); paint-order: stroke; stroke: var(--fair-bg); stroke-width: 4px; stroke-linejoin: round; }
.edge-label.hot { fill: var(--tool-accent); }
.edge-label.dim { opacity: 0.14; }

.node { cursor: pointer; }
.node.dim { opacity: 0.14; }
.node .halo { fill: var(--c-soft); opacity: 0; }
.node.focus .halo { opacity: 1; }
.node .disc { fill: var(--fair-surface); stroke: var(--c); stroke-width: 2.5; transition: stroke-width 0.15s; }
.node.focus .disc { fill: var(--c); }
.node:hover .disc { stroke-width: 3.5; }
.node .glyph { fill: var(--c); font-family: var(--fair-font-mono); font-size: 11px; font-weight: 500; text-anchor: middle; dominant-baseline: central; text-transform: uppercase; pointer-events: none; }
.node.focus .glyph { fill: var(--fair-bg); }
.node .nlabel { font-family: var(--fair-font-sans); font-weight: 600; font-size: 12.5px; fill: var(--fair-text); text-anchor: middle; paint-order: stroke; stroke: var(--fair-bg); stroke-width: 4px; stroke-linejoin: round; pointer-events: none; }
.node.focus .nlabel { font-family: var(--fair-font-sans); font-weight: 500; font-size: 15px; fill: var(--fair-text-strong); }

.attrtag.dim { opacity: 0.14; }
.attrtag rect { fill: var(--fair-surface); stroke: var(--fair-border); stroke-width: 1; }
.attrtag .apred { font-family: var(--fair-font-mono); font-size: 9px; letter-spacing: 0.04em; fill: var(--fair-text-muted); text-transform: uppercase; dominant-baseline: central; }
.attrtag .aval { font-family: var(--fair-font-mono); font-size: 11.5px; dominant-baseline: central; }
.attrtag.lit .aval { fill: var(--fair-warning); }
.attrtag.iri .aval { fill: var(--tool-accent); }

.legend {
  position: absolute; left: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 5px;
  padding: 11px 13px; border: 1px solid var(--fair-separator); border-radius: 12px;
  background: color-mix(in srgb, var(--fair-surface) 88%, transparent); backdrop-filter: blur(8px); box-shadow: var(--fair-shadow-2);
}
.legend h4 { margin: 6px 0 3px; font-family: var(--fair-font-mono); font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--fair-text-light); font-weight: 700; }
.legend h4:first-child { margin-top: 0; }
.lrow { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--fair-text); }
.sw-rec { width: 11px; height: 11px; border-radius: 4px; border: 2px solid currentColor; flex: none; }
.sw-tag { width: 13px; height: 9px; border-radius: 3px; border: 1px solid var(--fair-border); background: var(--fair-surface); flex: none; }
.empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--fair-text-muted); font-size: 13px; }
</style>
