import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "How vLLM works" — the paged KV cache.
 *
 * Three sequences grow token by token on the left; every few tokens the
 * scheduler hands each one a KV page at a deliberately scattered slot in the
 * memory grid on the right. No sequence ever owns a contiguous block — that
 * is the whole trick. Midway, seq c arrives sharing seq a's prefix and lights
 * the exact same four pages instead of allocating new ones.
 *
 * Narrative beats over `progress`:
 *   0.02–0.18  memory grid + empty sequence tracks draw in
 *   0.20–0.78  bars grow token by token; pages light at scattered slots
 *   0.55–0.70  radix prefix sharing: seq c reuses seq a's first four pages
 *   0.85–1.00  ~60% lit, zero contiguous blocks — "paged · no fragmentation"
 */

const COLS = 10;
const ROWS = 7;
const CELL = 34;
const PITCH = 42; // cell + 8 gap
const GRID_X = 442;
const GRID_Y = 150;

const BAR_X = 70;
const BAR_W = 290;
const BAR_H = 16;

// Fixed scatter maps (index = row * 10 + col). Hand-placed so that no two
// pages belonging to the same sequence are ever orthogonally adjacent — the
// non-contiguity IS the diagram.
const A_CELLS = [3, 17, 41, 55, 26, 62, 9, 38, 44, 58, 21, 66, 33, 50] as const;
const B_CELLS = [8, 22, 39, 51, 5, 64, 30, 16, 47, 60, 24, 53, 11, 68, 42] as const;
const C_CELLS = [6, 35, 57, 19, 46, 63, 28, 0, 49, 14, 61, 37, 20] as const;
/** seq a's first four pages — reused verbatim by seq c (radix prefix hit). */
const SHARED_CELLS = [3, 17, 41, 55] as const;

const SEQS = [
  { label: "seq a", y: 170, start: 0.2, end: 0.68, tokens: 14, sharedSpan: 4 / 14 },
  { label: "seq b", y: 250, start: 0.24, end: 0.72, tokens: 15, sharedSpan: 0 },
  { label: "seq c", y: 330, start: 0.55, end: 0.78, tokens: 17, sharedSpan: 4 / 17 },
] as const;

/** When a page is claimed (progress) and where its allocation dot flies from. */
type CellSpec = { at: number; ox: number; oy: number };

const CELL_SPECS: CellSpec[] = (() => {
  const specs: CellSpec[] = Array.from({ length: COLS * ROWS }, () => ({
    at: 2, // never claimed — transforms stay inert
    ox: 0,
    oy: 0,
  }));
  A_CELLS.forEach((cell, i) => {
    const f = (i + 1) / 14;
    specs[cell] = { at: 0.2 + f * 0.48, ox: BAR_X + BAR_W * f, oy: 170 };
  });
  B_CELLS.forEach((cell, i) => {
    const f = (i + 1) / 15;
    specs[cell] = { at: 0.24 + f * 0.48, ox: BAR_X + BAR_W * f, oy: 250 };
  });
  // seq c's tokens 1–4 hit seq a's prefix pages (no new claim); its own
  // pages arrive with tokens 5–17.
  C_CELLS.forEach((cell, i) => {
    const f = (i + 5) / 17;
    specs[cell] = { at: 0.55 + f * 0.23, ox: BAR_X + BAR_W * f, oy: 330 };
  });
  return specs;
})();

const SCHED = { x: 70, y: 46, size: 16, gap: 22 } as const;

export function PagedKvHero({ progress, active, accent, reduced }: HeroProps) {
  const structure = useTransform(progress, [0.02, 0.14], [0, 1]);
  const glow = useTransform(progress, [0.3, 0.85], [0, 0.4]);
  const sharedLabel = useTransform(progress, [0.58, 0.64], [0, 1]);
  const endLabel = useTransform(progress, [0.86, 0.93], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="pkv-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft heat rising off the memory region as pages fill */}
      <motion.circle
        cx={GRID_X + (COLS * PITCH - 8) / 2}
        cy={GRID_Y + (ROWS * PITCH - 8) / 2}
        r={250}
        fill="url(#pkv-glow)"
        style={{ opacity: glow }}
      />

      {/* memory region boundary */}
      <motion.rect
        x={GRID_X - 12}
        y={GRID_Y - 12}
        width={COLS * PITCH - 8 + 24}
        height={ROWS * PITCH - 8 + 24}
        rx={10}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: structure }}
      />

      {/* 10×7 page grid — hooks live inside Cell */}
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <Cell key={i} index={i} progress={progress} accent={accent} />
      ))}

      {/* radix prefix sharing: seq c re-lights seq a's first four pages */}
      {SHARED_CELLS.map((cell, i) => (
        <SharedEcho key={cell} cell={cell} order={i} progress={progress} accent={accent} />
      ))}

      {/* sequence tracks */}
      {SEQS.map((seq, i) => (
        <SeqBar
          key={seq.label}
          index={i}
          label={seq.label}
          y={seq.y}
          start={seq.start}
          end={seq.end}
          tokens={seq.tokens}
          sharedSpan={seq.sharedSpan}
          progress={progress}
          accent={accent}
        />
      ))}

      {/* scheduler tick: one step per decode round, three slots */}
      <motion.g style={{ opacity: structure }}>
        {[0, 1, 2].map((slot) => (
          <rect
            key={slot}
            x={SCHED.x + slot * SCHED.gap}
            y={SCHED.y}
            width={SCHED.size}
            height={SCHED.size}
            rx={4}
            fill={GHOST_FILL}
            stroke={GHOST_STROKE}
            strokeWidth={1.5}
          />
        ))}
        <motion.rect
          y={SCHED.y}
          width={SCHED.size}
          height={SCHED.size}
          rx={4}
          fill={accent}
          fillOpacity={0.5}
          stroke={accent}
          strokeWidth={2}
          animate={
            active && !reduced
              ? {
                  x: [
                    SCHED.x,
                    SCHED.x,
                    SCHED.x + SCHED.gap,
                    SCHED.x + SCHED.gap,
                    SCHED.x + SCHED.gap * 2,
                    SCHED.x + SCHED.gap * 2,
                  ],
                }
              : { x: SCHED.x }
          }
          transition={{
            duration: 2.4,
            times: [0, 0.31, 0.34, 0.64, 0.67, 1],
            ease: "linear",
            repeat: Infinity,
          }}
        />
      </motion.g>

      {/* shared prefix callout, pointing at the first shared page */}
      <motion.g style={{ opacity: sharedLabel }}>
        <text
          x={GRID_X + 3 * PITCH + CELL / 2}
          y={118}
          textAnchor="middle"
          fill={accent}
          style={LABEL_STYLE}
        >
          shared prefix
        </text>
        <line
          x1={GRID_X + 3 * PITCH + CELL / 2}
          y1={126}
          x2={GRID_X + 3 * PITCH + CELL / 2}
          y2={GRID_Y - 6}
          stroke={accent}
          strokeWidth={2}
        />
      </motion.g>

      {/* resolution */}
      <motion.text
        x={GRID_X + COLS * PITCH - 8}
        y={500}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: endLabel }}
      >
        paged · no fragmentation
      </motion.text>
    </svg>
  );
}

/**
 * One KV page slot. Draws in as ghost structure on a diagonal sweep, then —
 * if some sequence's scatter map claims it — receives a flying allocation dot
 * and lights up accent at the exact moment that sequence's bar crosses the
 * matching token boundary.
 */
function Cell({
  index,
  progress,
  accent,
}: {
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = GRID_X + col * PITCH;
  const y = GRID_Y + row * PITCH;
  const spec = CELL_SPECS[index];

  const sweep = (row + col) * 0.0065;
  const draw = useTransform(progress, [0.02 + sweep, 0.08 + sweep], [0, 1]);

  const claim = useTransform(progress, [spec.at - 0.004, spec.at + 0.02], [0, 1]);
  const pop = useTransform(claim, (v) => 0.65 + 0.35 * v);

  // allocation dot: bar tip → this page, landing exactly at claim time
  const flight = useTransform(progress, [spec.at - 0.04, spec.at], [0, 1]);
  const flightOn = useTransform(
    progress,
    [spec.at - 0.04, spec.at - 0.034, spec.at - 0.006, spec.at],
    [0, 1, 1, 0],
  );
  const fx = useTransform(flight, (t) => spec.ox + (x + CELL / 2 - spec.ox) * t);
  const fy = useTransform(flight, (t) => spec.oy + (y + CELL / 2 - spec.oy) * t);

  const claimed = spec.at < 1.5;

  return (
    <g>
      <motion.rect
        x={x}
        y={y}
        width={CELL}
        height={CELL}
        rx={6}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: draw }}
      />
      {claimed && (
        <motion.rect
          x={x}
          y={y}
          width={CELL}
          height={CELL}
          rx={6}
          fill={accent}
          fillOpacity={0.5}
          stroke={accent}
          strokeWidth={2}
          style={{ opacity: claim, scale: pop, originX: 0.5, originY: 0.5 }}
        />
      )}
      {claimed && (
        <motion.circle r={4} fill={accent} style={{ cx: fx, cy: fy, opacity: flightOn }} />
      )}
    </g>
  );
}

/**
 * The radix-sharing moment for one prefix page: seq c's bar sends its own
 * dot to a page seq a already holds; the page gains a second ring instead of
 * a second allocation.
 */
function SharedEcho({
  cell,
  order,
  progress,
  accent,
}: {
  cell: number;
  order: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  const x = GRID_X + col * PITCH;
  const y = GRID_Y + row * PITCH;

  const f = (order + 1) / 17; // seq c's tokens 1–4
  const at = 0.55 + f * 0.23;
  const ox = BAR_X + BAR_W * f;
  const oy = 330;

  const ring = useTransform(progress, [at, at + 0.025], [0, 1]);
  const flight = useTransform(progress, [at - 0.04, at], [0, 1]);
  const flightOn = useTransform(progress, [at - 0.04, at - 0.034, at - 0.006, at], [0, 1, 1, 0]);
  const fx = useTransform(flight, (t) => ox + (x + CELL / 2 - ox) * t);
  const fy = useTransform(flight, (t) => oy + (y + CELL / 2 - oy) * t);

  return (
    <g>
      <motion.rect
        x={x - 4.5}
        y={y - 4.5}
        width={CELL + 9}
        height={CELL + 9}
        rx={9}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: ring }}
      />
      <motion.rect
        x={x}
        y={y}
        width={CELL}
        height={CELL}
        rx={6}
        fill={accent}
        fillOpacity={0.25}
        style={{ opacity: ring }}
      />
      <motion.circle r={4} fill={accent} style={{ cx: fx, cy: fy, opacity: flightOn }} />
    </g>
  );
}

/**
 * One sequence track: a ghost rail with token tick marks and an accent fill
 * that grows token by token — scaleX quantized to whole tokens, so each step
 * lands in lockstep with a page lighting up in the grid.
 */
function SeqBar({
  index,
  label,
  y,
  start,
  end,
  tokens,
  sharedSpan,
  progress,
  accent,
}: {
  index: number;
  label: string;
  y: number;
  start: number;
  end: number;
  tokens: number;
  sharedSpan: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const draw = useTransform(progress, [0.04 + index * 0.025, 0.13 + index * 0.025], [0, 1]);
  const grow = useTransform(progress, [start, end], [0, 1]);
  const filled = useTransform(grow, (v) => Math.min(1, Math.floor(v * tokens + 1e-4) / tokens));
  const tipX = useTransform(filled, (v) => BAR_X + BAR_W * v);
  const tipOn = useTransform(progress, [start - 0.01, start, end, end + 0.02], [0, 1, 1, 0]);
  // underline marking the prefix tokens this sequence shares (a and c only)
  const sharedOn = useTransform(progress, [0.56, 0.62], [0, sharedSpan > 0 ? 1 : 0]);

  return (
    <g>
      <motion.text
        x={BAR_X}
        y={y - 16}
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: draw }}
      >
        {label}
      </motion.text>
      <motion.rect
        x={BAR_X}
        y={y - BAR_H / 2}
        width={BAR_W}
        height={BAR_H}
        rx={4}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: draw }}
      />
      <motion.rect
        x={BAR_X}
        y={y - BAR_H / 2}
        width={BAR_W}
        height={BAR_H}
        rx={4}
        fill={accent}
        fillOpacity={0.85}
        style={{ opacity: draw, scaleX: filled, originX: 0, originY: 0.5 }}
      />
      {/* token boundaries */}
      <motion.g style={{ opacity: draw }}>
        {Array.from({ length: tokens - 1 }, (_, i) => (
          <line
            key={i}
            x1={BAR_X + (BAR_W * (i + 1)) / tokens}
            y1={y - BAR_H / 2}
            x2={BAR_X + (BAR_W * (i + 1)) / tokens}
            y2={y + BAR_H / 2}
            stroke={GHOST_STROKE}
            strokeWidth={1.5}
          />
        ))}
      </motion.g>
      <motion.circle cy={y} r={5} fill={accent} style={{ cx: tipX, opacity: tipOn }} />
      {sharedSpan > 0 && (
        <motion.line
          x1={BAR_X}
          y1={y + 14}
          x2={BAR_X + BAR_W * sharedSpan}
          y2={y + 14}
          stroke={accent}
          strokeWidth={2}
          style={{ opacity: sharedOn }}
        />
      )}
    </g>
  );
}
