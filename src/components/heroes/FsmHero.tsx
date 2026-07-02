import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "Guided generation with Outlines"
 *
 * A regex compiled to a finite-state machine constrains decoding: from each
 * state only the tokens on valid outgoing edges are allowed, everything else
 * is masked. A cursor walks the machine left to right and the output string
 * assembles itself into JSON that cannot be malformed.
 *
 * Narrative beats over `progress`:
 *   0.02–0.20  machine draws in (states, valid edges, decoy edges)
 *   0.25–0.79  cursor walks the valid path; leaving a state masks its decoy
 *              edges (dashed, faded); one output chunk lands per arrival
 *   0.85–1.00  cursor rests in the double-circle accept state — accent ring,
 *              "valid json · guaranteed"
 */

type Pt = { x: number; y: number };

const R = 24;

const STATES: readonly Pt[] = [
  { x: 112, y: 332 },
  { x: 254, y: 274 },
  { x: 396, y: 242 },
  { x: 538, y: 242 },
  { x: 680, y: 274 },
  { x: 822, y: 332 },
];
const FINAL = STATES[5];

/** Self-loop above s2 — the [a-z]+ character class consuming the key. */
const LOOP = {
  cx: 396,
  cy: 196,
  r: 26,
  a0: (150 * Math.PI) / 180,
  sweep: (240 * Math.PI) / 180,
} as const;

const fmt = (n: number): number => Math.round(n * 10) / 10;

const lerp = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

function towards(from: Pt, to: Pt, dist: number): Pt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  return { x: from.x + (dx / len) * dist, y: from.y + (dy / len) * dist };
}

function arrowPath(tip: Pt, ang: number): string {
  const s = 9;
  const a1 = ang + 2.6;
  const a2 = ang - 2.6;
  return [
    `M ${fmt(tip.x + s * Math.cos(a1))} ${fmt(tip.y + s * Math.sin(a1))}`,
    `L ${fmt(tip.x)} ${fmt(tip.y)}`,
    `L ${fmt(tip.x + s * Math.cos(a2))} ${fmt(tip.y + s * Math.sin(a2))}`,
  ].join(" ");
}

type EdgeGeom = { d: string; arrow: string; lx: number; ly: number; c: Pt };

/** Quadratic edge trimmed to circle boundaries, with arrowhead + label spot. */
function quadEdge(a: Pt, b: Pt, ra: number, rb: number, bow: number, labelOut: number): EdgeGeom {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = dy / len;
  const ny = -dx / len;
  const c = { x: (a.x + b.x) / 2 + nx * bow, y: (a.y + b.y) / 2 + ny * bow };
  const p0 = towards(a, c, ra);
  const p1 = towards(b, c, rb);
  const d = `M ${fmt(p0.x)} ${fmt(p0.y)} Q ${fmt(c.x)} ${fmt(c.y)} ${fmt(p1.x)} ${fmt(p1.y)}`;
  const arrow = arrowPath(p1, Math.atan2(p1.y - c.y, p1.x - c.x));
  const qmx = 0.25 * p0.x + 0.5 * c.x + 0.25 * p1.x;
  const qmy = 0.25 * p0.y + 0.5 * c.y + 0.25 * p1.y;
  return { d, arrow, lx: fmt(qmx + nx * labelOut), ly: fmt(qmy + ny * labelOut), c };
}

const E0 = quadEdge(STATES[0], STATES[1], R, R, 14, 24);
const E1 = quadEdge(STATES[1], STATES[2], R, R, 14, 24);
const E3 = quadEdge(STATES[2], STATES[3], R, R, 14, 24);
const E4 = quadEdge(STATES[3], STATES[4], R, R, 14, 24);
const E5 = quadEdge(STATES[4], STATES[5], R, R, 14, 24);

const LOOP_ENTRY: Pt = {
  x: LOOP.cx + LOOP.r * Math.cos(LOOP.a0),
  y: LOOP.cy + LOOP.r * Math.sin(LOOP.a0),
};
const LOOP_EXIT: Pt = {
  x: LOOP.cx + LOOP.r * Math.cos(LOOP.a0 + LOOP.sweep),
  y: LOOP.cy + LOOP.r * Math.sin(LOOP.a0 + LOOP.sweep),
};
const LOOP_D = `M ${fmt(LOOP_ENTRY.x)} ${fmt(LOOP_ENTRY.y)} A ${LOOP.r} ${LOOP.r} 0 1 1 ${fmt(LOOP_EXIT.x)} ${fmt(LOOP_EXIT.y)}`;
const LOOP_ARROW = arrowPath(
  LOOP_EXIT,
  Math.atan2(Math.cos(LOOP.a0 + LOOP.sweep), -Math.sin(LOOP.a0 + LOOP.sweep)),
);

/** Cursor traversal windows — one per consumed token, dwell between steps. */
const WALK: readonly (readonly [number, number])[] = [
  [0.25, 0.32],
  [0.34, 0.41],
  [0.43, 0.5],
  [0.52, 0.59],
  [0.61, 0.68],
  [0.7, 0.77],
];

type ValidEdge = {
  d: string;
  arrow: string;
  label: string;
  lx: number;
  ly: number;
  draw: readonly [number, number];
  walk: readonly [number, number];
};

const drawWin = (i: number): readonly [number, number] => [0.04 + i * 0.016, 0.12 + i * 0.016];

const VALID_EDGES: readonly ValidEdge[] = [
  { ...E0, label: "{", draw: drawWin(0), walk: WALK[0] },
  { ...E1, label: '"', draw: drawWin(1), walk: WALK[1] },
  {
    d: LOOP_D,
    arrow: LOOP_ARROW,
    label: "a-z",
    lx: 396,
    ly: 156,
    c: { x: LOOP.cx, y: LOOP.cy },
    draw: drawWin(2),
    walk: WALK[2],
  },
  { ...E3, label: '"', draw: drawWin(3), walk: WALK[3] },
  { ...E4, label: ":", draw: drawWin(4), walk: WALK[4] },
  { ...E5, label: "}", draw: drawWin(5), walk: WALK[5] },
];

type Decoy = {
  d: string;
  arrow: string;
  node: Pt;
  draw: readonly [number, number];
  maskT: number;
};

const decoy = (from: Pt, node: Pt, draw: readonly [number, number], maskT: number): Decoy => {
  const g = quadEdge(from, node, R, 12, 12, 0);
  return { d: g.d, arrow: g.arrow, node, draw, maskT };
};

/** Invalid continuations — edges to nowhere, masked as the cursor departs. */
const DECOYS: readonly Decoy[] = [
  decoy(STATES[1], { x: 322, y: 156 }, [0.09, 0.16], WALK[1][0]),
  decoy(STATES[3], { x: 604, y: 134 }, [0.11, 0.18], WALK[4][0]),
  decoy(STATES[4], { x: 768, y: 172 }, [0.13, 0.2], WALK[5][0]),
];

type Seg =
  | { kind: "quad"; t0: number; t1: number; a: Pt; c: Pt; b: Pt }
  | { kind: "loop"; t0: number; t1: number };

const SEGS: readonly Seg[] = [
  { kind: "quad", t0: WALK[0][0], t1: WALK[0][1], a: STATES[0], c: E0.c, b: STATES[1] },
  { kind: "quad", t0: WALK[1][0], t1: WALK[1][1], a: STATES[1], c: E1.c, b: STATES[2] },
  { kind: "loop", t0: WALK[2][0], t1: WALK[2][1] },
  { kind: "quad", t0: WALK[3][0], t1: WALK[3][1], a: STATES[2], c: E3.c, b: STATES[3] },
  { kind: "quad", t0: WALK[4][0], t1: WALK[4][1], a: STATES[3], c: E4.c, b: STATES[4] },
  { kind: "quad", t0: WALK[5][0], t1: WALK[5][1], a: STATES[4], c: E5.c, b: STATES[5] },
];

const smooth = (t: number): number => t * t * (3 - 2 * t);

function segPoint(s: Seg, e: number): Pt {
  if (s.kind === "quad") {
    const u = 1 - e;
    return {
      x: u * u * s.a.x + 2 * u * e * s.c.x + e * e * s.b.x,
      y: u * u * s.a.y + 2 * u * e * s.c.y + e * e * s.b.y,
    };
  }
  // self-loop: out of s2, around the a-z circle, back into s2
  const home = STATES[2];
  const IN = 0.15;
  const OUT = 0.85;
  if (e <= IN) return lerp(home, LOOP_ENTRY, e / IN);
  if (e >= OUT) return lerp(LOOP_EXIT, home, (e - OUT) / (1 - OUT));
  const th = LOOP.a0 + LOOP.sweep * ((e - IN) / (OUT - IN));
  return { x: LOOP.cx + LOOP.r * Math.cos(th), y: LOOP.cy + LOOP.r * Math.sin(th) };
}

/** Piecewise position of the decoding cursor along the valid path. */
function pointAt(p: number): Pt {
  let pt = STATES[0];
  for (const s of SEGS) {
    if (p <= s.t0) break;
    const t = Math.min(1, (p - s.t0) / (s.t1 - s.t0));
    pt = segPoint(s, smooth(t));
  }
  return pt;
}

/** Output chunks land one per state arrival and concatenate to valid JSON. */
const ARRIVE: readonly number[] = [0.32, 0.41, 0.5, 0.59, 0.68, 0.77];
const CHUNKS: readonly { text: string; chars: number }[] = [
  { text: "{", chars: 0 },
  { text: '"', chars: 1 },
  { text: "name", chars: 2 },
  { text: '"', chars: 6 },
  { text: ":", chars: 7 },
  { text: '"ada"}', chars: 9 },
];
const OUT_X = 360;
const OUT_Y = 456;
const CH_W = 15.6;
const CHUNK_FILL = "oklch(0.96 0.005 265 / 0.55)";

const MONO_GLYPH = { fontFamily: "var(--font-mono)", fontSize: 14 } as const;
const MONO_CHUNK = { fontFamily: "var(--font-mono)", fontSize: 26 } as const;

const STUB_ARROW = arrowPath({ x: 84, y: 332 }, 0);

export function FsmHero({ progress, active, accent, reduced }: HeroProps) {
  const titleOp = useTransform(progress, [0.05, 0.12], [0, 1]);
  const stubLen = useTransform(progress, [0.02, 0.07], [0, 1]);
  const stubArrowOp = useTransform(progress, [0.05, 0.08], [0, 1]);

  const cursorOp = useTransform(progress, [0.22, 0.25], [0, 1]);
  const cursorX = useTransform(progress, (p) => pointAt(p).x);
  const cursorY = useTransform(progress, (p) => pointAt(p).y);

  const maskedLabelOp = useTransform(progress, [0.34, 0.39], [0, 1]);
  const outputLabelOp = useTransform(progress, [0.28, 0.33], [0, 1]);

  const ringOp = useTransform(progress, [0.85, 0.92], [0, 1]);
  const glowOp = useTransform(progress, [0.85, 0.96], [0, 1]);
  const endLabelOp = useTransform(progress, [0.88, 0.95], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="fsm-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* accept-state glow, behind everything */}
      <motion.circle
        cx={FINAL.x}
        cy={FINAL.y}
        r={92}
        fill="url(#fsm-glow)"
        style={{ opacity: glowOp }}
      />

      <motion.text x={64} y={72} fill={GHOST_STROKE} style={{ ...LABEL_STYLE, opacity: titleOp }}>
        regex → fsm
      </motion.text>

      {/* start stub into s0 */}
      <motion.line
        x1={50}
        y1={332}
        x2={76}
        y2={332}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ pathLength: stubLen }}
      />
      <motion.path
        d={STUB_ARROW}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: stubArrowOp }}
      />

      {/* decoy edges: the tokens the fsm masks out */}
      {DECOYS.map((d, i) => (
        <DecoyEdge key={i} decoy={d} progress={progress} />
      ))}

      {/* valid edges, each carrying one allowed token */}
      {VALID_EDGES.map((e, i) => (
        <ValidEdgePath key={i} edge={e} progress={progress} accent={accent} />
      ))}

      {/* states */}
      {STATES.map((_, i) => (
        <StateNode key={i} index={i} progress={progress} />
      ))}

      <motion.text
        x={322}
        y={134}
        textAnchor="middle"
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: maskedLabelOp }}
      >
        masked tokens
      </motion.text>

      {/* decoding cursor */}
      <motion.g style={{ opacity: cursorOp }}>
        <motion.circle
          r={13}
          fill={accent}
          style={{ cx: cursorX, cy: cursorY }}
          initial={{ opacity: 0.18 }}
          animate={active && !reduced ? { opacity: [0.28, 0.1, 0.28] } : { opacity: 0.18 }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle r={6} fill={accent} style={{ cx: cursorX, cy: cursorY }} />
      </motion.g>

      {/* accept ring on the double-circle final state */}
      <motion.circle
        cx={FINAL.x}
        cy={FINAL.y}
        r={31}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: ringOp }}
      />

      {/* output string, one chunk per arrival */}
      <motion.text
        x={OUT_X}
        y={423}
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: outputLabelOp }}
      >
        output
      </motion.text>
      {CHUNKS.map((_, i) => (
        <OutputChunk key={i} index={i} progress={progress} accent={accent} />
      ))}

      <motion.text
        x={856}
        y={396}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: endLabelOp }}
      >
        valid json · guaranteed
      </motion.text>
    </svg>
  );
}

function StateNode({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const s = STATES[index];
  const op = useTransform(progress, [0.02 + index * 0.018, 0.09 + index * 0.018], [0, 1]);
  const isFinal = index === STATES.length - 1;
  return (
    <motion.g style={{ opacity: op }}>
      <circle cx={s.x} cy={s.y} r={R} fill={GHOST_FILL} stroke={GHOST_STROKE} strokeWidth={1.5} />
      {isFinal ? (
        <circle cx={s.x} cy={s.y} r={17} fill="none" stroke={GHOST_STROKE} strokeWidth={1.5} />
      ) : null}
    </motion.g>
  );
}

function ValidEdgePath({
  edge,
  progress,
  accent,
}: {
  edge: ValidEdge;
  progress: MotionValue<number>;
  accent: string;
}) {
  const [d0, d1] = edge.draw;
  const [w0, w1] = edge.walk;
  const drawLen = useTransform(progress, [d0, d1], [0, 1]);
  // The accent stroke chases the cursor across the edge as the token commits.
  const accentLen = useTransform(progress, [w0, w1], [0, 1]);
  const accentOp = useTransform(progress, [w0, w0 + 0.015], [0, 1]);
  const arrowGhostOp = useTransform(progress, [d1 - 0.03, d1, w1 - 0.02, w1], [0, 1, 1, 0]);
  const arrowAccentOp = useTransform(progress, [w1 - 0.02, w1], [0, 1]);
  // Token label flips to accent the moment it is the chosen continuation.
  const labelGhostOp = useTransform(progress, [0.14, 0.2, w0, w0 + 0.03], [0, 1, 1, 0]);
  const labelAccentOp = useTransform(progress, [w0, w0 + 0.03], [0, 1]);
  return (
    <g>
      <motion.path
        d={edge.d}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ pathLength: drawLen }}
      />
      <motion.path
        d={edge.d}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ pathLength: accentLen, opacity: accentOp }}
      />
      <motion.path
        d={edge.arrow}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: arrowGhostOp }}
      />
      <motion.path
        d={edge.arrow}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: arrowAccentOp }}
      />
      <motion.text
        x={edge.lx}
        y={edge.ly}
        textAnchor="middle"
        fill={GHOST_STROKE}
        style={{ ...MONO_GLYPH, opacity: labelGhostOp }}
      >
        {edge.label}
      </motion.text>
      <motion.text
        x={edge.lx}
        y={edge.ly}
        textAnchor="middle"
        fill={accent}
        style={{ ...MONO_GLYPH, opacity: labelAccentOp }}
      >
        {edge.label}
      </motion.text>
    </g>
  );
}

function DecoyEdge({ decoy, progress }: { decoy: Decoy; progress: MotionValue<number> }) {
  const [d0, d1] = decoy.draw;
  const m = decoy.maskT;
  const drawLen = useTransform(progress, [d0, d1], [0, 1]);
  // Flip to dashed + faded at the step where the cursor leaves this state:
  // oklch strokes cannot be interpolated, so crossfade two stacked paths.
  const solidOp = useTransform(progress, [m - 0.02, m + 0.02], [1, 0]);
  const dashOp = useTransform(progress, [m - 0.02, m + 0.02], [0, 0.7]);
  const nodeOp = useTransform(progress, [d0, d1, m - 0.02, m + 0.02], [0, 1, 1, 0.4]);
  const arrowOp = useTransform(progress, [d1 - 0.02, d1, m - 0.02, m + 0.02], [0, 1, 1, 0.25]);
  return (
    <g>
      <motion.path
        d={decoy.d}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ pathLength: drawLen, opacity: solidOp }}
      />
      <motion.path
        d={decoy.d}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        strokeDasharray="5 7"
        style={{ opacity: dashOp }}
      />
      <motion.path
        d={decoy.arrow}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: arrowOp }}
      />
      <motion.circle
        cx={decoy.node.x}
        cy={decoy.node.y}
        r={8}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: nodeOp }}
      />
    </g>
  );
}

function OutputChunk({
  index,
  progress,
  accent,
}: {
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const c = CHUNKS[index];
  const arrive = ARRIVE[index];
  const settle = index < CHUNKS.length - 1 ? ARRIVE[index + 1] : 0.85;
  // Newest token lands in accent, then settles to neutral as the next lands.
  const hotOp = useTransform(
    progress,
    [arrive - 0.005, arrive + 0.02, settle, settle + 0.03],
    [0, 1, 1, 0],
  );
  const setOp = useTransform(progress, [settle, settle + 0.03], [0, 1]);
  const x = OUT_X + c.chars * CH_W;
  return (
    <g>
      <motion.text x={x} y={OUT_Y} fill={CHUNK_FILL} style={{ ...MONO_CHUNK, opacity: setOp }}>
        {c.text}
      </motion.text>
      <motion.text x={x} y={OUT_Y} fill={accent} style={{ ...MONO_CHUNK, opacity: hotOp }}>
        {c.text}
      </motion.text>
    </g>
  );
}
