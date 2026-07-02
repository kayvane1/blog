import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "Setting up Datadog APM in Modal"
 *
 * A trace waterfall assembles span by span under a time ruler. One deep span
 * — the Modal function call — runs 2x its expected length, turns accent, and
 * pushes every downstream span later. The sampler then drops two shallow
 * spans, and the p95 badge closes the trace.
 *
 * Narrative beats over `progress`:
 *   0.02–0.15  time ruler draws (line, ticks, ms labels)
 *   0.15–0.65  eight spans cascade in, parent → child, connectors first
 *   0.55–0.70  modal.fn extends to 2x; ancestors stretch, downstream slides
 *   0.72–0.85  two shallow spans get dashed strokes and dim — sampled away
 *   0.88–1.00  p95 badge, bottom-right
 */

const BAR_H = 22;
const RULER_Y = 90;

/** Extension window: the slow span doubles, the trace ripples right. */
const EXT0 = 0.55;
const EXT1 = 0.7;

const TICKS = [
  { x: 140, label: "0ms" },
  { x: 310, label: "200ms" },
  { x: 480, label: "400ms" },
  { x: 650, label: "600ms" },
  { x: 820, label: "800ms" },
] as const;

type SpanDef = {
  /** Final geometry (ruler maps 0–800ms onto x 140–820). */
  x: number;
  w: number;
  y: number;
  /** Top edge of the parent bar; null for the root span. */
  parentY: number | null;
  kind: "normal" | "slow" | "sampled";
  /** Pre-extension width, for spans that stretch when modal.fn runs long. */
  preW?: number;
  /** Leftward offset before the extension, for downstream spans. */
  shift?: number;
};

const SPANS: readonly SpanDef[] = [
  { x: 140, w: 680, y: 140, parentY: null, kind: "normal", preW: 536 }, // handler
  { x: 154, w: 68, y: 182, parentY: 140, kind: "normal" }, // auth
  { x: 166, w: 48, y: 224, parentY: 182, kind: "normal" }, // db.query
  { x: 232, w: 48, y: 266, parentY: 140, kind: "sampled" }, // cache.get
  { x: 293, w: 323, y: 308, parentY: 140, kind: "normal", preW: 179 }, // rpc.call
  { x: 307, w: 289, y: 350, parentY: 308, kind: "slow", preW: 145 }, // modal.fn
  { x: 636, w: 54, y: 392, parentY: 140, kind: "sampled", shift: 144 }, // encode
  { x: 704, w: 109, y: 434, parentY: 140, kind: "normal", shift: 144 }, // resp.write
];

const enterAt = (index: number) => 0.15 + index * 0.055;

export function TraceWaterfallHero({ progress, active, accent, reduced }: HeroProps) {
  const rulerDraw = useTransform(progress, [0.02, 0.13], [0, 1]);
  const labelHandler = useTransform(progress, [0.25, 0.31], [0, 1]);
  const labelDb = useTransform(progress, [0.36, 0.42], [0, 1]);
  const glowIn = useTransform(progress, [0.56, EXT1], [0, 1]);
  const slowLabelIn = useTransform(progress, [0.62, EXT1], [0, 1]);
  const sampledLabelIn = useTransform(progress, [0.76, 0.84], [0, 1]);
  const badgeIn = useTransform(progress, [0.88, 0.96], [0, 1]);
  const badgeY = useTransform(progress, [0.88, 0.96], [10, 0]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="tw-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft glow behind the slow span; idle pulse gated on active */}
      <motion.g
        initial={{ opacity: 1 }}
        animate={active && !reduced ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.ellipse
          cx={451}
          cy={361}
          rx={190}
          ry={46}
          fill="url(#tw-glow)"
          style={{ opacity: glowIn }}
        />
      </motion.g>

      {/* time ruler */}
      <motion.line
        x1={140}
        y1={RULER_Y}
        x2={820}
        y2={RULER_Y}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ pathLength: rulerDraw }}
      />
      {TICKS.map((tick, i) => (
        <RulerTick key={tick.x} x={tick.x} label={tick.label} index={i} progress={progress} />
      ))}

      {/* span bars, waterfall order */}
      {SPANS.map((span, i) => (
        <SpanBar key={span.y} span={span} index={i} progress={progress} accent={accent} />
      ))}

      {/* names on key spans only */}
      <motion.text
        x={132}
        y={155}
        textAnchor="end"
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: labelHandler }}
      >
        handler
      </motion.text>
      <motion.text
        x={158}
        y={239}
        textAnchor="end"
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: labelDb }}
      >
        db.query
      </motion.text>

      {/* the culprit */}
      <motion.text x={307} y={387} fill={accent} style={{ ...LABEL_STYLE, opacity: slowLabelIn }}>
        modal.fn · 340ms
      </motion.text>

      {/* sampled away */}
      <motion.text
        x={626}
        y={407}
        textAnchor="end"
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: sampledLabelIn }}
      >
        sampled
      </motion.text>

      {/* resolution badge */}
      <motion.text
        x={826}
        y={552}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: badgeIn, y: badgeY }}
      >
        p95 340ms · traced end to end
      </motion.text>
    </svg>
  );
}

function RulerTick({
  x,
  label,
  index,
  progress,
}: {
  x: number;
  label: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const fade = useTransform(progress, [0.04 + index * 0.018, 0.1 + index * 0.018], [0, 1]);
  return (
    <motion.g style={{ opacity: fade }}>
      <line x1={x} y1={RULER_Y} x2={x} y2={RULER_Y + 8} stroke={GHOST_STROKE} strokeWidth={1.5} />
      <text x={x} y={RULER_Y - 14} textAnchor="middle" fill={GHOST_STROKE} style={LABEL_STYLE}>
        {label}
      </text>
    </motion.g>
  );
}

function SpanBar({
  span,
  index,
  progress,
  accent,
}: {
  span: SpanDef;
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const t0 = enterAt(index);
  const t1 = t0 + 0.09;
  const preFrac = span.preW !== undefined ? span.preW / span.w : 1;
  const dimT0 = index === 3 ? 0.72 : 0.74;

  // Bars scale X from 0 at their left edge; spans containing the slow call
  // hold at their expected length, then stretch to the real one.
  const grow = useTransform(
    progress,
    span.preW !== undefined ? [t0, t1, EXT0, EXT1] : [t0, t1],
    span.preW !== undefined ? [0, preFrac, preFrac, 1] : [0, 1],
  );
  // Downstream spans start earlier and get pushed right by the slow call.
  const shift = useTransform(progress, [EXT0, EXT1], [-(span.shift ?? 0), 0]);

  const ghostRange =
    span.kind === "slow"
      ? { at: [t0, t0 + 0.03, 0.56, 0.66], to: [0, 1, 1, 0] }
      : span.kind === "sampled"
        ? { at: [t0, t0 + 0.03, dimT0, dimT0 + 0.11], to: [0, 1, 1, 0.15] }
        : { at: [t0, t0 + 0.03], to: [0, 1] };
  const ghostO = useTransform(progress, ghostRange.at, ghostRange.to);
  // oklch strings don't interpolate: crossfade a ghost bar and an accent bar.
  const accentO = useTransform(progress, [0.56, 0.66], span.kind === "slow" ? [0, 1] : [0, 0]);
  const dashO = useTransform(
    progress,
    [dimT0, dimT0 + 0.11],
    span.kind === "sampled" ? [0, 0.55] : [0, 0],
  );
  const connDraw = useTransform(progress, [t0 - 0.05, t0 + 0.01], [0, 1]);

  return (
    <g>
      {span.parentY !== null && (
        <motion.line
          x1={span.x}
          y1={span.parentY + BAR_H}
          x2={span.x}
          y2={span.y + BAR_H / 2}
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
          style={{ x: shift, pathLength: connDraw }}
        />
      )}
      <motion.rect
        x={span.x}
        y={span.y}
        width={span.w}
        height={BAR_H}
        rx={4}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ x: shift, scaleX: grow, originX: 0, originY: 0.5, opacity: ghostO }}
      />
      {span.kind === "slow" && (
        <motion.rect
          x={span.x}
          y={span.y}
          width={span.w}
          height={BAR_H}
          rx={4}
          fill={accent}
          fillOpacity={0.28}
          stroke={accent}
          strokeWidth={2}
          style={{ scaleX: grow, originX: 0, originY: 0.5, opacity: accentO }}
        />
      )}
      {span.kind === "sampled" && (
        <motion.rect
          x={span.x}
          y={span.y}
          width={span.w}
          height={BAR_H}
          rx={4}
          fill="none"
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
          strokeDasharray="6 5"
          style={{ opacity: dashO }}
        />
      )}
    </g>
  );
}
