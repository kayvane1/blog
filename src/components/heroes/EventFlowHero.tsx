import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "Event Driven Evolutionary Software"
 *
 * A service graph that grows itself. Three services stream observability
 * events into a hub; a signals gauge fills cell by cell; when it tops out the
 * system buds new capability from what it observed — twice — until a
 * seven-node graph settles with events still flowing on the new edges.
 *
 * Narrative beats over `progress`:
 *   0.02–0.18  initial three-node graph draws in
 *   0.20–0.50  event dots pulse along the edges; the signals gauge fills
 *   0.45–0.60  gauge full → the hub decides → nodes 4–5 bud out
 *   0.65–0.80  nodes 6–7 join; the first bud earns its load-bearing ring
 *   0.85–1.00  settled at 7 nodes, events flowing on the new edges
 */

const R = 22;

type NodeSpec = {
  x: number;
  y: number;
  /** progress window over which the node scales in (r: 0 → 22) */
  grow: [number, number];
  label?: string;
  labelDy?: number;
};

// 0–2: the original graph. 3: first bud (becomes load-bearing). 4–6: later buds.
const NODES: NodeSpec[] = [
  { x: 280, y: 300, grow: [0.02, 0.08], label: "svc", labelDy: 48 },
  { x: 170, y: 170, grow: [0.05, 0.11], label: "svc", labelDy: -38 },
  { x: 430, y: 170, grow: [0.08, 0.14] },
  { x: 520, y: 330, grow: [0.5, 0.56] },
  { x: 620, y: 150, grow: [0.53, 0.59] },
  { x: 700, y: 300, grow: [0.69, 0.75] },
  { x: 560, y: 470, grow: [0.72, 0.78] },
];

const HUB = NODES[0];
const BUD = NODES[3];

type EdgeSpec = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** progress window over which the edge draws in (pathLength 0 → 1) */
  draw: [number, number];
  /** growth edges flash accent as they draw, then settle into structure */
  growth: boolean;
};

/** Edge trimmed back from both node centers so it meets the circle rims. */
function edge(a: NodeSpec, b: NodeSpec, draw: [number, number], growth: boolean): EdgeSpec {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const inset = R + 4;
  return {
    x1: a.x + (dx / len) * inset,
    y1: a.y + (dy / len) * inset,
    x2: b.x - (dx / len) * inset,
    y2: b.y - (dy / len) * inset,
    draw,
    growth,
  };
}

const EDGES: EdgeSpec[] = [
  edge(NODES[0], NODES[1], [0.08, 0.16], false),
  edge(NODES[0], NODES[2], [0.1, 0.18], false),
  edge(NODES[0], NODES[3], [0.45, 0.52], true),
  edge(NODES[2], NODES[4], [0.48, 0.55], true),
  edge(NODES[3], NODES[5], [0.65, 0.72], true),
  edge(NODES[3], NODES[6], [0.68, 0.75], true),
];

type DotSpec = {
  edgeIndex: number;
  /** fixed cycle offset so the dots on one edge stagger */
  phase: number;
  /** full traversals across the progress window */
  cycles: number;
  from: number;
  to: number;
  /** -1 flows against the edge direction, i.e. back toward the hub */
  dir: 1 | -1;
  fadeOut: boolean;
};

// Observe phase: events stream from the leaves into the hub, three staggered
// dots per edge. Settle phase: the grown graph keeps reporting back — two
// dots per new edge plus a murmur on the originals. All offsets are fixed.
const DOTS: DotSpec[] = [
  { edgeIndex: 0, phase: 0, cycles: 3, from: 0.2, to: 0.54, dir: -1, fadeOut: true },
  { edgeIndex: 0, phase: 0.34, cycles: 3, from: 0.2, to: 0.54, dir: -1, fadeOut: true },
  { edgeIndex: 0, phase: 0.67, cycles: 3, from: 0.2, to: 0.54, dir: -1, fadeOut: true },
  { edgeIndex: 1, phase: 0.15, cycles: 3, from: 0.2, to: 0.54, dir: -1, fadeOut: true },
  { edgeIndex: 1, phase: 0.48, cycles: 3, from: 0.2, to: 0.54, dir: -1, fadeOut: true },
  { edgeIndex: 1, phase: 0.81, cycles: 3, from: 0.2, to: 0.54, dir: -1, fadeOut: true },
  { edgeIndex: 2, phase: 0.3, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 2, phase: 0.72, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 3, phase: 0.3, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 3, phase: 0.72, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 4, phase: 0.3, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 4, phase: 0.72, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 5, phase: 0.3, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 5, phase: 0.72, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 0, phase: 0.5, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
  { edgeIndex: 1, phase: 0.5, cycles: 2, from: 0.84, to: 1, dir: -1, fadeOut: false },
];

// Signals gauge: eight cells, filled bottom-up as events accumulate.
const GAUGE = { x: 842, cellX: 836, baseY: 340, cellSize: 12, cellStep: 16, cells: 8 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fract = (v: number) => v - Math.floor(v);

export function EventFlowHero({ progress, active, accent, reduced }: HeroProps) {
  const gaugeUi = useTransform(progress, [0.12, 0.18], [0, 1]);
  // The hub's core brightens as signals accumulate: observe.
  const hubCore = useTransform(progress, [0.2, 0.46], [0, 0.9]);
  // Gauge tops out → the hub fires once: decide.
  const decidePulse = useTransform(progress, [0.45, 0.48, 0.54], [0, 0.8, 0]);
  const decideR = useTransform(progress, [0.45, 0.54], [R, R + 16]);
  const thresholdOn = useTransform(progress, [0.455, 0.48], [0, 1]);
  // The first bud is now load-bearing.
  const ringIn = useTransform(progress, [0.72, 0.79], [0, 1]);
  const endLabel = useTransform(progress, [0.86, 0.93], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="ef-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* edges */}
      {EDGES.map((e, i) => (
        <GraphEdge key={i} spec={e} progress={progress} accent={accent} />
      ))}

      {/* glow under the load-bearing bud */}
      <motion.circle
        cx={BUD.x}
        cy={BUD.y}
        r={72}
        fill="url(#ef-glow)"
        style={{ opacity: ringIn }}
      />

      {/* event dots */}
      {DOTS.map((d, i) => (
        <FlowDot key={i} spec={d} progress={progress} accent={accent} />
      ))}

      {/* nodes */}
      {NODES.map((n, i) => (
        <GraphNode key={i} spec={n} progress={progress} accent={accent} />
      ))}

      {/* hub core: signals accumulating, then the decide pulse */}
      <motion.circle cx={HUB.x} cy={HUB.y} r={6} fill={accent} style={{ opacity: hubCore }} />
      <motion.circle
        cx={HUB.x}
        cy={HUB.y}
        r={decideR}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: decidePulse }}
      />

      {/* load-bearing ring on the first bud */}
      <motion.circle
        cx={BUD.x}
        cy={BUD.y}
        r={32}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: ringIn }}
        animate={active && !reduced ? { scale: [1, 1.07, 1] } : { scale: 1 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* signals gauge */}
      <motion.rect
        x={GAUGE.x - 12}
        y={210}
        width={24}
        height={136}
        rx={4}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: gaugeUi }}
      />
      {Array.from({ length: GAUGE.cells }, (_, i) => (
        <GaugeCell key={i} index={i} progress={progress} accent={accent} />
      ))}
      <motion.circle cx={GAUGE.x} cy={196} r={5} fill={accent} style={{ opacity: thresholdOn }} />
      <motion.text
        x={GAUGE.x}
        y={374}
        textAnchor="middle"
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: gaugeUi }}
      >
        signals
      </motion.text>

      {/* resolution */}
      <motion.text
        x={838}
        y={560}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: endLabel }}
      >
        observe · decide · evolve
      </motion.text>
    </svg>
  );
}

function GraphNode({
  spec,
  progress,
  accent,
}: {
  spec: NodeSpec;
  progress: MotionValue<number>;
  accent: string;
}) {
  const [g0, g1] = spec.grow;
  // Slight overshoot as the node scales in: a mechanical pop, not a swoosh.
  const r = useTransform(progress, [g0, g0 + (g1 - g0) * 0.7, g1], [0, R + 3, R]);
  const nodeIn = useTransform(progress, [g0, g0 + 0.015], [0, 1]);
  const labelIn = useTransform(progress, [g1, g1 + 0.04], [0, 1]);
  // Buds announce themselves with a one-shot accent ripple.
  const popOpacity = useTransform(progress, [g1 - 0.02, g1 + 0.03, g1 + 0.1], [0, 0.9, 0]);
  const popR = useTransform(progress, [g1 - 0.02, g1 + 0.1], [R, R + 20]);
  const isBud = g0 > 0.2;

  return (
    <g>
      <motion.circle
        cx={spec.x}
        cy={spec.y}
        r={r}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: nodeIn }}
      />
      {isBud ? (
        <motion.circle
          cx={spec.x}
          cy={spec.y}
          r={popR}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          style={{ opacity: popOpacity }}
        />
      ) : null}
      {spec.label ? (
        <motion.text
          x={spec.x}
          y={spec.y + (spec.labelDy ?? 44)}
          textAnchor="middle"
          fill={GHOST_STROKE}
          style={{ ...LABEL_STYLE, opacity: labelIn }}
        >
          {spec.label}
        </motion.text>
      ) : null}
    </g>
  );
}

function GraphEdge({
  spec,
  progress,
  accent,
}: {
  spec: EdgeSpec;
  progress: MotionValue<number>;
  accent: string;
}) {
  const draw = useTransform(progress, spec.draw, [0, 1]);
  // Growth edges draw in live (accent), then hand over to the ghost structure.
  const liveFade = useTransform(
    progress,
    [spec.draw[0], spec.draw[1], spec.draw[1] + 0.12],
    [0, 1, 0],
  );
  const d = `M ${spec.x1} ${spec.y1} L ${spec.x2} ${spec.y2}`;

  return (
    <g>
      <motion.path
        d={d}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ pathLength: draw }}
      />
      {spec.growth ? (
        <motion.path
          d={d}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          style={{ pathLength: draw, opacity: liveFade }}
        />
      ) : null}
    </g>
  );
}

function FlowDot({
  spec,
  progress,
  accent,
}: {
  spec: DotSpec;
  progress: MotionValue<number>;
  accent: string;
}) {
  const e = EDGES[spec.edgeIndex];
  // Position along the edge: repeated traversals derived purely from progress,
  // so scrubbing backwards replays the pulses in reverse.
  const t = useTransform(progress, (p) => {
    const local = clamp01((p - spec.from) / (spec.to - spec.from));
    const cycle = fract(local * spec.cycles + spec.phase);
    return spec.dir === 1 ? cycle : 1 - cycle;
  });
  const cx = useTransform(t, (v) => e.x1 + (e.x2 - e.x1) * v);
  const cy = useTransform(t, (v) => e.y1 + (e.y2 - e.y1) * v);
  const opacity = useTransform(progress, (p) => {
    const gateIn = clamp01((p - spec.from) / 0.02);
    const gateOut = spec.fadeOut ? clamp01((spec.to - p) / 0.03) : 1;
    const local = clamp01((p - spec.from) / (spec.to - spec.from));
    const cycle = fract(local * spec.cycles + spec.phase);
    // Triangle window per traversal: dots are born at one rim, die at the other.
    const tri = Math.min(1, Math.min(cycle, 1 - cycle) * 7);
    return Math.min(gateIn, gateOut) * tri;
  });

  return <motion.circle r={5} fill={accent} style={{ cx, cy, opacity }} />;
}

function GaugeCell({
  index,
  progress,
  accent,
}: {
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  // Cells latch on one at a time across the observe phase: 0.23 → 0.454.
  const on = 0.23 + index * 0.032;
  const opacity = useTransform(progress, [on - 0.012, on + 0.012], [0, 1]);
  const y = GAUGE.baseY - GAUGE.cellSize - index * GAUGE.cellStep;

  return (
    <motion.rect
      x={GAUGE.cellX}
      y={y}
      width={GAUGE.cellSize}
      height={GAUGE.cellSize}
      rx={2}
      fill={accent}
      style={{ opacity }}
    />
  );
}
