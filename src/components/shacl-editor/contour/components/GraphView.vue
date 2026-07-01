<script setup lang="ts">
// A node-link graph of the schema's RDF, rendered as an overlay. Built from the
// parsed quads with a small hand-rolled force layout + SVG (no graph library),
// styled in Contour's palette. Two toggles tame the noise: collapse RDF lists
// (sh:in / sh:or) into a single chip, and hide annotation/plumbing predicates.
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import { shorten } from '../rdf';
import type { Quad } from '../rdf';
import type { Prefix } from '../types';
import { useI18n } from '../composables/useI18n';
import Icon from './Icon.vue';

const props = defineProps<{ quads: Quad[]; prefixes: Prefix[] }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const DCT = 'http://purl.org/dc/terms/';
const SH = 'http://www.w3.org/ns/shacl#';
const DASH = 'http://datashapes.org/dash#';
const RDF_FIRST = RDF + 'first', RDF_REST = RDF + 'rest';

// Predicates hidden by the "Hide annotations" toggle — labels, form hints, and
// rdf:type-to-shape (shape nodes are styled from their type regardless).
const HIDE = new Set([
  RDF + 'type', RDFS + 'label', RDFS + 'comment', DCT + 'description',
  SH + 'name', SH + 'description', SH + 'order', SH + 'message', SH + 'severity',
  SH + 'defaultValue', SH + 'group', DASH + 'editor',
]);

const collapseLists = ref(true);
const hideAnnotations = ref(true);

const short = (iri: string) => shorten(iri, props.prefixes);
const truncate = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

type NodeKind = 'shape' | 'group' | 'bnode' | 'iri' | 'literal' | 'list';
interface GNode { id: string; label: string; kind: NodeKind; x: number; y: number; vx: number; vy: number; w: number; fx: number | null; fy: number | null; }
interface GLink { s: string; tg: string; label: string; }

// ── Static analysis of the quads (independent of toggles) ────────────────────
const shapeIds = new Set<string>();
const groupIds = new Set<string>();
const firstOf = new Map<string, Quad['object']>();
const restOf = new Map<string, Quad['object']>();
const spineIds = new Set<string>();
for (const q of props.quads) {
  if (q.predicate.value === RDF + 'type') {
    if (q.object.value === SH + 'NodeShape') shapeIds.add(q.subject.id);
    if (q.object.value === SH + 'PropertyGroup') groupIds.add(q.subject.id);
  } else if (q.predicate.value === RDF_FIRST) { firstOf.set(q.subject.id, q.object); spineIds.add(q.subject.id); }
  else if (q.predicate.value === RDF_REST) { restOf.set(q.subject.id, q.object); }
}
function listMembers(headId: string): Quad['object'][] {
  const out: Quad['object'][] = [];
  let id: string | undefined = headId;
  const seen = new Set<string>();
  while (id && !seen.has(id) && firstOf.has(id)) {
    seen.add(id);
    out.push(firstOf.get(id)!);
    const rest = restOf.get(id);
    id = rest && rest.termType === 'BlankNode' ? rest.id : undefined;
  }
  return out;
}
function listLabel(headId: string): string {
  const parts = listMembers(headId).map((m) =>
    m.termType === 'NamedNode' ? short(m.value) : m.termType === 'Literal' ? `"${truncate(m.value, 12)}"` : '[ ]',
  );
  return '( ' + truncate(parts.join(' '), 34) + ' )';
}

// ── Build the graph for the current toggles (carry positions over) ───────────
const nodes = shallowRef<GNode[]>([]);
const links = shallowRef<GLink[]>([]);
let byId = new Map<string, GNode>();

function build() {
  const prev = byId;
  const nb = new Map<string, GNode>();
  const ns: GNode[] = [];
  const ls: GLink[] = [];
  const collapse = collapseLists.value;
  const hide = hideAnnotations.value;

  const seed = (i: number) => { const a = i * 2.399, r = 24 * Math.sqrt(i + 1); return { x: Math.cos(a) * r, y: Math.sin(a) * r }; };
  function ensure(opts: { id: string; kind: NodeKind; label: string }): GNode {
    let n = nb.get(opts.id);
    if (n) return n;
    const p = prev.get(opts.id);
    const s = p ? { x: p.x, y: p.y } : seed(ns.length);
    n = { id: opts.id, kind: opts.kind, label: opts.label,
          x: s.x, y: s.y, vx: p?.vx ?? 0, vy: p?.vy ?? 0, fx: null, fy: null,
          w: opts.kind === 'bnode' ? 16 : Math.max(46, opts.label.length * 7 + 18) };
    nb.set(opts.id, n); ns.push(n);
    return n;
  }
  function nodeFor(term: Quad['object']): GNode {
    if (term.termType === 'Literal') return ensure({ id: term.id, kind: 'literal', label: `"${truncate(term.value)}"` });
    if (term.termType === 'BlankNode') {
      const kind: NodeKind = shapeIds.has(term.id) ? 'shape' : groupIds.has(term.id) ? 'group' : 'bnode';
      return ensure({ id: term.id, kind, label: kind === 'bnode' ? '' : short((term as { value: string }).value) || '[ ]' });
    }
    const kind: NodeKind = shapeIds.has(term.id) ? 'shape' : groupIds.has(term.id) ? 'group' : 'iri';
    return ensure({ id: term.id, kind, label: short(term.value) });
  }

  for (const q of props.quads) {
    const pred = q.predicate.value;
    if (collapse && (pred === RDF_FIRST || pred === RDF_REST)) continue;
    if (collapse && spineIds.has(q.subject.id)) continue; // a list-spine node's own triples
    if (hide && HIDE.has(pred)) continue;
    if (collapse && q.object.termType === 'BlankNode' && spineIds.has(q.object.id)) {
      const owner = nodeFor(q.subject);
      const list = ensure({ id: 'list:' + q.object.id, kind: 'list', label: listLabel(q.object.id) });
      ls.push({ s: owner.id, tg: list.id, label: short(pred) });
      continue;
    }
    const s = nodeFor(q.subject);
    const o = nodeFor(q.object);
    ls.push({ s: s.id, tg: o.id, label: short(pred) });
  }

  // Drop nodes left with no edges (e.g. annotation literals once hidden),
  // keeping shape nodes so an otherwise-bare shape still appears.
  const used = new Set<string>();
  ls.forEach((l) => { used.add(l.s); used.add(l.tg); });
  const kept = ns.filter((n) => used.has(n.id) || n.kind === 'shape');
  byId = new Map(kept.map((n) => [n.id, n]));
  nodes.value = kept;
  links.value = ls.filter((l) => byId.has(l.s) && byId.has(l.tg));
}

const empty = computed(() => nodes.value.length === 0);

// ── Force simulation ─────────────────────────────────────────────────────────
const LINK_DIST = 78, SPRING = 0.04, REPULSE = 5200, GRAVITY = 0.015, DAMP = 0.88, VMAX = 40;
let alpha = 1;
let raf = 0;
const view = reactive({ x: 0, y: 0, k: 1 });
const svgEl = ref<SVGSVGElement | null>(null);
const tickFlag = ref(0);
const clamp = (v: number, m: number) => (v > m ? m : v < -m ? -m : v);

function physics() {
  const ns = nodes.value, ls = links.value;
  for (let i = 0; i < ns.length; i++) {
    const a = ns[i]!;
    for (let j = i + 1; j < ns.length; j++) {
      const b = ns[j]!;
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy || 0.01;
      const d = Math.sqrt(d2);
      const f = (REPULSE / d2) * alpha;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  for (const l of ls) {
    const a = byId.get(l.s)!, b = byId.get(l.tg)!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const f = (d - LINK_DIST) * SPRING * alpha;
    const fx = (dx / d) * f, fy = (dy / d) * f;
    a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
  }
  for (const n of ns) {
    if (n.fx !== null) { n.x = n.fx; n.y = n.fy!; n.vx = 0; n.vy = 0; continue; }
    n.vx = clamp((n.vx - n.x * GRAVITY * alpha) * DAMP, VMAX);
    n.vy = clamp((n.vy - n.y * GRAVITY * alpha) * DAMP, VMAX);
    n.x += n.vx; n.y += n.vy;
  }
  alpha *= 0.985;
}
function settle(ticks: number, startAlpha: number) {
  alpha = startAlpha;
  for (let i = 0; i < ticks && alpha > 0.02; i++) physics();
  tickFlag.value++;
}
function step() {
  if (alpha > 0.02) { physics(); tickFlag.value++; }
  raf = requestAnimationFrame(step);
}

function fit() {
  if (!nodes.value.length || !svgEl.value) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes.value) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y); }
  const pad = 80;
  const w = svgEl.value.clientWidth, h = svgEl.value.clientHeight;
  const k = Math.min(2, Math.max(0.2, Math.min(w / ((maxX - minX) + pad * 2), h / ((maxY - minY) + pad * 2))));
  view.k = k;
  view.x = w / 2 - ((minX + maxX) / 2) * k;
  view.y = h / 2 - ((minY + maxY) / 2) * k;
}

onMounted(() => {
  build();
  settle(320, 1);
  alpha = 0;
  raf = requestAnimationFrame(step);
  setTimeout(fit, 60); // fit once the overlay SVG has real dimensions
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); });

// Rebuild on toggle change, keeping positions, then re-settle gently and re-fit.
watch([collapseLists, hideAnnotations], () => {
  build();
  settle(180, 0.5);
  fit();
  alpha = 0;
});

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close'); }

// ── Interaction: pan, zoom, drag ─────────────────────────────────────────────
function toGraph(clientX: number, clientY: number) {
  const r = svgEl.value!.getBoundingClientRect();
  return { x: (clientX - r.left - view.x) / view.k, y: (clientY - r.top - view.y) / view.k };
}
let dragNode: GNode | null = null;
let panning = false;
let last = { x: 0, y: 0 };
function onNodeDown(e: PointerEvent, n: GNode) {
  e.stopPropagation();
  (e.target as Element).setPointerCapture?.(e.pointerId);
  dragNode = n;
  const g = toGraph(e.clientX, e.clientY);
  n.fx = g.x; n.fy = g.y;
  alpha = Math.max(alpha, 0.4);
}
function onBgDown(e: PointerEvent) {
  panning = true; last = { x: e.clientX, y: e.clientY };
  (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
}
function onMove(e: PointerEvent) {
  if (dragNode) {
    const g = toGraph(e.clientX, e.clientY);
    dragNode.fx = g.x; dragNode.fy = g.y;
    alpha = Math.max(alpha, 0.2);
  } else if (panning) {
    view.x += e.clientX - last.x; view.y += e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
  }
}
function onUp() {
  if (dragNode) { dragNode.fx = null; dragNode.fy = null; }
  dragNode = null; panning = false;
}
function onWheel(e: WheelEvent) {
  e.preventDefault();
  const r = svgEl.value!.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const nk = Math.min(4, Math.max(0.15, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  view.x = mx - ((mx - view.x) * nk) / view.k;
  view.y = my - ((my - view.y) * nk) / view.k;
  view.k = nk;
}
function mid(l: GLink) {
  const a = byId.get(l.s)!, b = byId.get(l.tg)!;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
</script>

<template>
  <Teleport to="body">
    <div class="graph-overlay" @click.self="emit('close')">
      <div class="graph-modal">
        <div class="graph-modal__bar">
          <div class="graph-modal__title">{{ t('graph.title') }}</div>
          <div class="graph-legend">
            <span><i class="lg lg--shape" />{{ t('graph.legend.shape') }}</span>
            <span><i class="lg lg--bnode" />{{ t('graph.legend.property') }}</span>
            <span><i class="lg lg--iri" />{{ t('graph.legend.iri') }}</span>
            <span><i class="lg lg--literal" />{{ t('graph.legend.literal') }}</span>
          </div>
          <div class="graph-toggles">
            <label><input v-model="collapseLists" type="checkbox" /> {{ t('graph.collapseLists') }}</label>
            <label><input v-model="hideAnnotations" type="checkbox" /> {{ t('graph.hideAnnotations') }}</label>
          </div>
          <div class="graph-modal__actions">
            <button class="btn btn-ghost btn-sm" @click="fit">{{ t('graph.fit') }}</button>
            <button class="btn btn-ghost btn-xs" :title="t('graph.close')" @click="emit('close')">
              <Icon name="x" :size="14" />
            </button>
          </div>
        </div>

        <div v-if="empty" class="graph-empty">{{ t('graph.empty') }}</div>
        <svg
          v-else
          ref="svgEl"
          class="graph-svg"
          @pointerdown="onBgDown"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointerleave="onUp"
          @wheel="onWheel"
        >
          <defs>
            <marker id="gv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="var(--color-text-light)" />
            </marker>
          </defs>
          <g :transform="`translate(${view.x},${view.y}) scale(${view.k})`" :data-t="tickFlag">
            <g class="gv-edges">
              <template v-for="(l, i) in links" :key="i">
                <line
                  class="gv-edge"
                  :x1="byId.get(l.s)!.x" :y1="byId.get(l.s)!.y"
                  :x2="byId.get(l.tg)!.x" :y2="byId.get(l.tg)!.y"
                  marker-end="url(#gv-arrow)"
                />
                <text class="gv-edge-label" :x="mid(l).x" :y="mid(l).y">{{ l.label }}</text>
              </template>
            </g>
            <g
              v-for="n in nodes"
              :key="n.id"
              class="gv-node"
              :class="`gv-node--${n.kind}`"
              :transform="`translate(${n.x},${n.y})`"
              @pointerdown="onNodeDown($event, n)"
            >
              <circle v-if="n.kind === 'bnode'" r="8" />
              <rect v-else :x="-n.w / 2" y="-13" :width="n.w" height="26" rx="7" />
              <text v-if="n.kind !== 'bnode'" text-anchor="middle" dy="0.32em">{{ n.label }}</text>
            </g>
          </g>
        </svg>
        <div class="graph-hint">{{ t('graph.hint') }}</div>
      </div>
    </div>
  </Teleport>
</template>
