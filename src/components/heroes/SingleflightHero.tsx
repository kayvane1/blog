import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "Claiming, not caching — singleflight on Modal"
 *
 * Six containers fire the same lookup at once. One claims the key, the rest
 * park; a single round-trip hits the database and the response fans back out.
 *
 * Narrative beats over `progress`:
 *   0.00–0.18  structure draws in (containers, merge ring, database)
 *   0.20–0.40  thundering herd: six requests race toward the merge point
 *   0.42–0.55  one lane claims; the other five park and dim
 *   0.55–0.78  single round-trip to the database and back
 *   0.78–1.00  response fans out; every container ends holding the value
 */

const CONTAINERS = [110, 186, 262, 338, 414, 490] as const;

/** 0 → 1 as the fan-out response reaches the waiters. */
function accentBlend(p: number): number {
  if (p <= 0.77) return 0;
  if (p >= 0.79) return 1;
  return (p - 0.77) / 0.02;
}
const CLAIMER = 2;
const LANE_X = 168; // right edge of container boxes
const MERGE = { x: 470, y: 300 } as const;
const DB = { x: 760, y: 300 } as const;

export function SingleflightHero({ progress, active, accent, reduced }: HeroProps) {
  const structure = useTransform(progress, [0.02, 0.18], [0, 1]);
  const claimUi = useTransform(progress, [0.42, 0.5], [0, 1]);
  const tripLabel = useTransform(progress, [0.58, 0.64], [0, 1]);
  const doneBadge = useTransform(progress, [0.9, 0.97], [0, 1]);

  // Claimer round-trip: merge → db → merge
  const tripT = useTransform(progress, [0.55, 0.66, 0.68, 0.78], [0, 1, 1, 0]);
  const tripX = useTransform(tripT, (t) => MERGE.x + 26 + (DB.x - 62 - (MERGE.x + 26)) * t);
  const tripDot = useTransform(progress, [0.54, 0.56, 0.77, 0.79], [0, 1, 1, 0]);
  const dbPulse = useTransform(progress, [0.6, 0.66, 0.74], [0, 1, 0]);
  const trunkGlow = useTransform(progress, [0.5, 0.58], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="sf-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* containers */}
      {CONTAINERS.map((y, i) => (
        <Container key={y} y={y} index={i} progress={progress} accent={accent} />
      ))}
      <motion.text x={82} y={72} fill={GHOST_STROKE} style={{ ...LABEL_STYLE, opacity: structure }}>
        6 callers
      </motion.text>

      {/* lanes + herd dots */}
      {CONTAINERS.map((y, i) => (
        <Lane key={y} y={y} index={i} progress={progress} accent={accent} />
      ))}

      {/* merge ring: the claim */}
      <motion.circle
        cx={MERGE.x}
        cy={MERGE.y}
        r={26}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: structure }}
      />
      <motion.circle
        cx={MERGE.x}
        cy={MERGE.y}
        r={26}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: claimUi }}
        animate={active && !reduced ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* padlock glyph */}
      <motion.g style={{ opacity: claimUi }} stroke={accent} strokeWidth={2} fill="none">
        <rect x={MERGE.x - 8} y={MERGE.y - 3} width={16} height={12} rx={2} />
        <path d={`M ${MERGE.x - 5} ${MERGE.y - 3} v -4 a 5 5 0 0 1 10 0 v 4`} />
      </motion.g>
      <motion.text
        x={MERGE.x}
        y={MERGE.y + 54}
        textAnchor="middle"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: claimUi }}
      >
        claim · entity:42
      </motion.text>

      {/* trunk to database */}
      <motion.line
        x1={MERGE.x + 26}
        y1={MERGE.y}
        x2={DB.x - 62}
        y2={DB.y}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: structure }}
      />
      <motion.line
        x1={MERGE.x + 26}
        y1={MERGE.y}
        x2={DB.x - 62}
        y2={DB.y}
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: trunkGlow }}
      />
      <motion.circle cy={MERGE.y} r={5} fill={accent} style={{ cx: tripX, opacity: tripDot }} />
      <motion.text
        x={(MERGE.x + DB.x - 36) / 2}
        y={MERGE.y - 20}
        textAnchor="middle"
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: tripLabel }}
      >
        1 round-trip
      </motion.text>

      {/* database cylinder */}
      <motion.g style={{ opacity: structure }} stroke={GHOST_STROKE} strokeWidth={1.5}>
        <motion.circle
          cx={DB.x}
          cy={DB.y}
          r={92}
          fill="url(#sf-glow)"
          stroke="none"
          style={{ opacity: dbPulse }}
        />
        <path
          d={`M ${DB.x - 55} ${DB.y - 52} v 104 a 55 20 0 0 0 110 0 v -104`}
          fill={GHOST_FILL}
        />
        <ellipse cx={DB.x} cy={DB.y - 52} rx={55} ry={20} fill={GHOST_FILL} />
        <text
          x={DB.x}
          y={DB.y + 96}
          textAnchor="middle"
          fill={GHOST_STROKE}
          stroke="none"
          style={LABEL_STYLE}
        >
          database
        </text>
      </motion.g>

      {/* resolution badge */}
      <motion.text
        x={818}
        y={548}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: doneBadge }}
      >
        6 callers · 1 fetch
      </motion.text>
    </svg>
  );
}

function Container({
  y,
  index,
  progress,
  accent,
}: {
  y: number;
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const draw = useTransform(progress, [0.02 + index * 0.02, 0.14 + index * 0.02], [0, 1]);
  const filled = useTransform(progress, [0.93, 0.98], [0, 1]);
  return (
    <g>
      <motion.rect
        x={112}
        y={y - 22}
        width={56}
        height={44}
        rx={6}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: draw }}
      />
      <motion.text
        x={140}
        y={y + 4}
        textAnchor="middle"
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: draw }}
      >
        c{index + 1}
      </motion.text>
      <motion.circle cx={98} cy={y} r={4} fill={accent} style={{ opacity: filled }} />
    </g>
  );
}

function Lane({
  y,
  index,
  progress,
  accent,
}: {
  y: number;
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const isClaimer = index === CLAIMER;
  const stagger = index * 0.012;

  const draw = useTransform(progress, [0.08 + stagger, 0.2 + stagger], [0, 1]);
  // Non-claimers dim once the claim lands; the claimer's lane stays lit.
  const dim = useTransform(progress, [0.42, 0.52], [1, isClaimer ? 1 : 0.3]);
  const laneOpacity = useTransform(() => draw.get() * dim.get());

  // Herd: out to the merge ring (non-claimers park at 86% of the lane),
  // hold while the claimer does the round-trip, then travel home.
  const park = isClaimer ? 1 : 0.86;
  const travel = useTransform(
    progress,
    [0.2 + stagger, 0.38 + stagger, 0.78, 0.95 - stagger],
    [0, park, park, 0],
  );
  const dotVisible = useTransform(
    progress,
    [0.19 + stagger, 0.21 + stagger, 0.94, 0.97],
    [0, 1, 1, 0],
  );

  const startX = LANE_X;
  const endX = MERGE.x - 26;
  const dx = endX - startX;
  const dy = MERGE.y - y;
  const cx = useTransform(travel, (t) => startX + dx * t);
  const cy = useTransform(travel, (t) => y + dy * t);
  // Waiters swap to the accent the moment the value fans back out. Color
  // strings in oklch don't interpolate, so crossfade two dots instead.
  const ghostDot = useTransform(() =>
    isClaimer ? 0 : dotVisible.get() * (1 - accentBlend(progress.get())),
  );
  const accentDot = useTransform(
    () => dotVisible.get() * (isClaimer ? 1 : accentBlend(progress.get())),
  );

  return (
    <g>
      <motion.line
        x1={startX}
        y1={y}
        x2={endX}
        y2={MERGE.y}
        stroke={isClaimer ? accent : GHOST_STROKE}
        strokeWidth={isClaimer ? 2 : 1.5}
        style={{ opacity: laneOpacity }}
      />
      <motion.circle r={4.5} fill={GHOST_STROKE} style={{ cx, cy, opacity: ghostDot }} />
      <motion.circle r={4.5} fill={accent} style={{ cx, cy, opacity: accentDot }} />
    </g>
  );
}
