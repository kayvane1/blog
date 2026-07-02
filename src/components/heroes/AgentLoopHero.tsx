import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "On building with agents"
 *
 * The agent loop with guard rails. A runner dot cycles plan → act → verify
 * between two hard rails; each completed pass earns a tick. "act" farms work
 * out to two sub-agent loops, their results flow back, and the run ends on a
 * verified check. Loops all the way down.
 *
 * Narrative beats over `progress`:
 *   0.02–0.18  guard rails + loop structure draw in
 *   0.20–0.50  the dot runs the cycle twice; a tick drops after each pass
 *   0.45–0.65  two sub-agent loops spawn off "act" and start cycling
 *   0.70–0.85  sub-loop results travel back to "act" as accent dots
 *   0.85–1.00  check glyph draws at "verify" · loops all the way down
 */

type Pt = { x: number; y: number };

const smooth = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Point on the quadratic bezier a–c–b at t. */
function qAt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return {
    x: s * s * a.x + 2 * s * t * c.x + t * t * b.x,
    y: s * s * a.y + 2 * s * t * c.y + t * t * b.y,
  };
}

/** Polar-form control point for the sub-curve of a quadratic on [u, v]. */
function qSubControl(a: Pt, c: Pt, b: Pt, u: number, v: number): Pt {
  const w0 = (1 - u) * (1 - v);
  const w1 = (1 - u) * v + u * (1 - v);
  const w2 = u * v;
  return { x: w0 * a.x + w1 * c.x + w2 * b.x, y: w0 * a.y + w1 * c.y + w2 * b.y };
}

const NODE_ORDER = ["plan", "act", "verify"] as const;
type NodeName = (typeof NODE_ORDER)[number];

/** Vertex offsets from a loop's centroid at scale 1. */
const REL: Record<NodeName, Pt> = {
  plan: { x: 0, y: -133 },
  act: { x: 122, y: 67 },
  verify: { x: -122, y: 67 },
};

type Edge = { a: Pt; c: Pt; b: Pt; d: string; arrow: string };
type Loop = { verts: Record<NodeName, Pt>; edges: Edge[]; r: number };

const TRIM = 0.14; // fraction trimmed off each arc end so arcs stop at node rims
const BULGE = 42; // outward control-point offset at scale 1

function makeLoop(cx: number, cy: number, s: number): Loop {
  const place = (p: Pt): Pt => ({ x: cx + p.x * s, y: cy + p.y * s });
  const verts: Record<NodeName, Pt> = {
    plan: place(REL.plan),
    act: place(REL.act),
    verify: place(REL.verify),
  };
  const edges = NODE_ORDER.map((name, i) => {
    const a = verts[name];
    const b = verts[NODE_ORDER[(i + 1) % 3]];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const m = Math.hypot(mid.x - cx, mid.y - cy);
    const c = {
      x: mid.x + ((mid.x - cx) / m) * BULGE * s,
      y: mid.y + ((mid.y - cy) / m) * BULGE * s,
    };
    const p0 = qAt(a, c, b, TRIM);
    const p1 = qAt(a, c, b, 1 - TRIM);
    const cc = qSubControl(a, c, b, TRIM, 1 - TRIM);
    const d = `M ${r1(p0.x)} ${r1(p0.y)} Q ${r1(cc.x)} ${r1(cc.y)} ${r1(p1.x)} ${r1(p1.y)}`;
    // Arrowhead at the arc's landing end, aligned with the local tangent.
    const tv = 1 - TRIM;
    const tan = {
      x: 2 * (1 - tv) * (c.x - a.x) + 2 * tv * (b.x - c.x),
      y: 2 * (1 - tv) * (c.y - a.y) + 2 * tv * (b.y - c.y),
    };
    const ang = Math.atan2(tan.y, tan.x);
    const wing = 11;
    const arrow = [
      `M ${r1(p1.x + Math.cos(ang + Math.PI - 0.5) * wing)} ${r1(p1.y + Math.sin(ang + Math.PI - 0.5) * wing)}`,
      `L ${r1(p1.x)} ${r1(p1.y)}`,
      `L ${r1(p1.x + Math.cos(ang + Math.PI + 0.5) * wing)} ${r1(p1.y + Math.sin(ang + Math.PI + 0.5) * wing)}`,
    ].join(" ");
    return { a, c, b, d, arrow };
  });
  return { verts, edges, r: 30 * s };
}

const MAIN = makeLoop(290, 301, 1);
const SUB_A = makeLoop(648, 228, 0.45);
const SUB_B = makeLoop(648, 404, 0.45);

/** Guard rails: the band no dot ever leaves. */
const RAIL = { x0: 70, x1: 830, top: 104, bottom: 496 } as const;
/** Textbook wall hatching on the outside of each rail — fixed, no scatter. */
const HATCH_XS = Array.from({ length: 14 }, (_, i) => 96 + i * 56);
const TOP_HATCHES = HATCH_XS.map((x) => `M ${x} ${RAIL.top} L ${x - 12} ${RAIL.top - 12}`).join(
  " ",
);
const BOTTOM_HATCHES = HATCH_XS.map(
  (x) => `M ${x} ${RAIL.bottom} L ${x - 12} ${RAIL.bottom + 12}`,
).join(" ");

type Link = { d: string; from: Pt; to: Pt };

/** Thin dispatch line from the main "act" node rim to a sub-loop's rim. */
function makeLink(loop: Loop): Link {
  const a = MAIN.verts.act;
  const b = loop.verts.verify;
  const m = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / m;
  const uy = (b.y - a.y) / m;
  const from = { x: a.x + ux * 36, y: a.y + uy * 36 };
  const to = { x: b.x - ux * 18, y: b.y - uy * 18 };
  return { d: `M ${r1(from.x)} ${r1(from.y)} L ${r1(to.x)} ${r1(to.y)}`, from, to };
}

const LINK_A = makeLink(SUB_A);
const LINK_B = makeLink(SUB_B);

/**
 * Position on a loop for a cycle phase t (1 = one full plan→act→verify lap).
 * Each edge is eased with smoothstep so the dot settles at every station.
 */
function cyclePos(loop: Loop, tRaw: number): Pt {
  const t = ((tRaw % 1) + 1) % 1;
  const s3 = Math.min(t * 3, 2.9999);
  const i = Math.floor(s3);
  const e = loop.edges[i];
  return qAt(e.a, e.c, e.b, smooth(s3 - i));
}

/**
 * The main agent's itinerary: two full laps, a hold at plan, a dispatch leg
 * to act, a wait while the sub-agents report back, then on to verify.
 */
function mainDotPos(p: number): Pt {
  if (p < 0.2) return MAIN.verts.plan;
  if (p < 0.5) return cyclePos(MAIN, (p - 0.2) / 0.15);
  if (p < 0.56) return MAIN.verts.plan;
  if (p < 0.64) {
    const e = MAIN.edges[0];
    return qAt(e.a, e.c, e.b, smooth((p - 0.56) / 0.08));
  }
  if (p < 0.84) return MAIN.verts.act;
  if (p < 0.92) {
    const e = MAIN.edges[1];
    return qAt(e.a, e.c, e.b, smooth((p - 0.84) / 0.08));
  }
  return MAIN.verts.verify;
}

type SubCfg = { spawn: number; cycStart: number; depart: number; arrive: number };

const SUB_A_CFG: SubCfg = { spawn: 0.45, cycStart: 0.51, depart: 0.7, arrive: 0.8 };
const SUB_B_CFG: SubCfg = { spawn: 0.52, cycStart: 0.58, depart: 0.74, arrive: 0.84 };

/** Sub-agent dot: 5/3 laps (ending at its verify vertex), then home along the link. */
function subDotPos(loop: Loop, link: Link, cfg: SubCfg, p: number): Pt {
  if (p < cfg.cycStart) return loop.verts.plan;
  if (p < cfg.depart) {
    return cyclePos(loop, ((p - cfg.cycStart) / (cfg.depart - cfg.cycStart)) * (5 / 3));
  }
  if (p < cfg.arrive) {
    const u = smooth((p - cfg.depart) / (cfg.arrive - cfg.depart));
    const from = loop.verts.verify;
    return { x: from.x + (link.from.x - from.x) * u, y: from.y + (link.from.y - from.y) * u };
  }
  return link.from;
}

export function AgentLoopHero({ progress, active, accent, reduced }: HeroProps) {
  const structure = useTransform(progress, [0.02, 0.16], [0, 1]);
  const railOn = useTransform(progress, [0.02, 0.04], [0, 1]);
  const railDraw = useTransform(progress, [0.02, 0.13], [0, 1]);
  const hatchIn = useTransform(progress, [0.12, 0.18], [0, 1]);
  const arrowIn = useTransform(progress, [0.14, 0.18], [0, 1]);

  const dotX = useTransform(progress, (p) => mainDotPos(p).x);
  const dotY = useTransform(progress, (p) => mainDotPos(p).y);
  const dotIn = useTransform(progress, [0.185, 0.205], [0, 1]);

  // "act" blips as each sub-agent's result lands (0.80, 0.84).
  const actPulse = useTransform(progress, [0.79, 0.805, 0.825, 0.845, 0.88], [0, 1, 0.35, 1, 0]);

  const glow = useTransform(progress, [0.84, 0.92, 1], [0, 0.9, 0.6]);
  const checkDraw = useTransform(progress, [0.85, 0.93], [0, 1]);
  const checkIn = useTransform(progress, [0.85, 0.87], [0, 1]);
  const verifyRing = useTransform(progress, [0.86, 0.92], [0, 1]);
  const endLabel = useTransform(progress, [0.88, 0.96], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="al-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* guard rails: hard walls the loop can never cross */}
      <motion.line
        x1={RAIL.x0}
        y1={RAIL.top}
        x2={RAIL.x1}
        y2={RAIL.top}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ pathLength: railDraw, opacity: railOn }}
      />
      <motion.line
        x1={RAIL.x0}
        y1={RAIL.bottom}
        x2={RAIL.x1}
        y2={RAIL.bottom}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ pathLength: railDraw, opacity: railOn }}
      />
      <motion.path
        d={TOP_HATCHES}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: hatchIn }}
      />
      <motion.path
        d={BOTTOM_HATCHES}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: hatchIn }}
      />
      <motion.text
        x={RAIL.x0}
        y={128}
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: hatchIn }}
      >
        guard rail
      </motion.text>

      {/* verify glow, under the final check */}
      <motion.circle
        cx={MAIN.verts.verify.x}
        cy={MAIN.verts.verify.y}
        r={80}
        fill="url(#al-glow)"
        style={{ opacity: glow }}
      />

      {/* main cycle arcs + direction arrowheads */}
      {MAIN.edges.map((e, i) => (
        <ArcDraw key={e.d} d={e.d} index={i} progress={progress} />
      ))}
      <motion.g fill="none" stroke={GHOST_STROKE} strokeWidth={1.5} style={{ opacity: arrowIn }}>
        {MAIN.edges.map((e) => (
          <path key={e.arrow} d={e.arrow} />
        ))}
      </motion.g>

      {/* plan / act / verify stations */}
      <motion.g style={{ opacity: structure }}>
        {NODE_ORDER.map((name) => (
          <circle
            key={name}
            cx={MAIN.verts[name].x}
            cy={MAIN.verts[name].y}
            r={MAIN.r}
            fill={GHOST_FILL}
            stroke={GHOST_STROKE}
            strokeWidth={1.5}
          />
        ))}
        <text
          x={MAIN.verts.plan.x}
          y={124}
          textAnchor="middle"
          fill={GHOST_STROKE}
          style={LABEL_STYLE}
        >
          plan
        </text>
        <text
          x={MAIN.verts.act.x}
          y={424}
          textAnchor="middle"
          fill={GHOST_STROKE}
          style={LABEL_STYLE}
        >
          act
        </text>
        <text
          x={MAIN.verts.verify.x}
          y={426}
          textAnchor="middle"
          fill={GHOST_STROKE}
          style={LABEL_STYLE}
        >
          verify
        </text>
      </motion.g>

      {/* one tick per completed pass, right of the loop */}
      <PassTick x={462} y={238} at={0.345} progress={progress} accent={accent} />
      <PassTick x={462} y={268} at={0.495} progress={progress} accent={accent} />

      {/* sub-agent loops hung off "act" */}
      <SubLoop loop={SUB_A} link={LINK_A} cfg={SUB_A_CFG} progress={progress} accent={accent} />
      <SubLoop loop={SUB_B} link={LINK_B} cfg={SUB_B_CFG} progress={progress} accent={accent} />

      {/* "act" rim blip when results land */}
      <motion.circle
        cx={MAIN.verts.act.x}
        cy={MAIN.verts.act.y}
        r={38}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: actPulse }}
      />

      {/* the agent */}
      <motion.circle r={6} fill={accent} style={{ cx: dotX, cy: dotY, opacity: dotIn }} />

      {/* final verification: ring + check glyph */}
      <motion.circle
        cx={MAIN.verts.verify.x}
        cy={MAIN.verts.verify.y}
        r={40}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: verifyRing }}
        animate={active && !reduced ? { scale: [1, 1.07, 1] } : { scale: 1 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M 92 366 L 104 380 L 126 352"
        fill="none"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength: checkDraw, opacity: checkIn }}
      />

      {/* resolution */}
      <motion.text
        x={830}
        y={548}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: endLabel }}
      >
        loops all the way down
      </motion.text>
    </svg>
  );
}

function ArcDraw({
  d,
  index,
  progress,
}: {
  d: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const draw = useTransform(progress, [0.05 + index * 0.025, 0.15 + index * 0.025], [0, 1]);
  const on = useTransform(progress, [0.05 + index * 0.025, 0.07 + index * 0.025], [0, 1]);
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={GHOST_STROKE}
      strokeWidth={1.5}
      style={{ pathLength: draw, opacity: on }}
    />
  );
}

function PassTick({
  x,
  y,
  at,
  progress,
  accent,
}: {
  x: number;
  y: number;
  at: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const draw = useTransform(progress, [at, at + 0.04], [0, 1]);
  const on = useTransform(progress, [at, at + 0.015], [0, 1]);
  return (
    <motion.path
      d={`M ${x} ${y + 6} L ${x + 6} ${y + 12} L ${x + 16} ${y - 2}`}
      fill="none"
      stroke={accent}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ pathLength: draw, opacity: on }}
    />
  );
}

function SubLoop({
  loop,
  link,
  cfg,
  progress,
  accent,
}: {
  loop: Loop;
  link: Link;
  cfg: SubCfg;
  progress: MotionValue<number>;
  accent: string;
}) {
  const linkDraw = useTransform(progress, [cfg.spawn, cfg.spawn + 0.05], [0, 1]);
  const linkOn = useTransform(progress, [cfg.spawn, cfg.spawn + 0.015], [0, 1]);
  const loopIn = useTransform(progress, [cfg.spawn + 0.04, cfg.spawn + 0.12], [0, 1]);
  // The result leg re-lights the link in accent while the dot travels home.
  const linkLive = useTransform(
    progress,
    [cfg.depart, cfg.depart + 0.02, cfg.arrive, cfg.arrive + 0.02],
    [0, 0.55, 0.55, 0],
  );
  const sdX = useTransform(progress, (p) => subDotPos(loop, link, cfg, p).x);
  const sdY = useTransform(progress, (p) => subDotPos(loop, link, cfg, p).y);
  const sdOn = useTransform(
    progress,
    [cfg.cycStart - 0.012, cfg.cycStart + 0.012, cfg.arrive - 0.012, cfg.arrive + 0.012],
    [0, 1, 1, 0],
  );

  return (
    <g>
      <motion.path
        d={link.d}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ pathLength: linkDraw, opacity: linkOn }}
      />
      <motion.path
        d={link.d}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: linkLive }}
      />
      <motion.g fill="none" stroke={GHOST_STROKE} strokeWidth={1.5} style={{ opacity: loopIn }}>
        {loop.edges.map((e) => (
          <motion.path key={e.d} d={e.d} style={{ pathLength: loopIn }} />
        ))}
      </motion.g>
      <motion.g style={{ opacity: loopIn }}>
        {NODE_ORDER.map((name) => (
          <circle
            key={name}
            cx={loop.verts[name].x}
            cy={loop.verts[name].y}
            r={loop.r}
            fill={GHOST_FILL}
            stroke={GHOST_STROKE}
            strokeWidth={1.5}
          />
        ))}
      </motion.g>
      <motion.circle r={4} fill={accent} style={{ cx: sdX, cy: sdY, opacity: sdOn }} />
    </g>
  );
}
