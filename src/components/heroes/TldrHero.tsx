import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "LLM-TLDR + Claude Hooks" — pre-digesting repo context into structured
 * summaries so the model skips the token tax.
 *
 * A 16×9 wall of raw file tokens compresses, row by row, into one compact
 * structured summary. A counter tallies the shrinking bill; what remains of
 * the wall is a ghost outline of tokens never read, never paid for.
 *
 * Narrative beats over `progress`:
 *   0.02–0.22  token wall draws in row by row (staggered opacity)
 *   0.30–0.65  compression: rows collapse toward the summary block while it
 *              scales 0.6 → 1 and its four dash-lines draw in
 *   0.55–0.75  mono counter crossfades 14,200 → 3,400 → 380 tok
 *   0.85–1.00  ghost outline where the wall stood ("unread, unpaid");
 *              summary block gains its accent border; end label lands
 */

const WALL = { x: 72, y: 112, cols: 16, rows: 9, colPitch: 33, rowPitch: 28, cellH: 18 } as const;
const SUMMARY = { x: 650, y: 380, w: 180, h: 120 } as const;
const SUMMARY_CX = SUMMARY.x + SUMMARY.w / 2;
const SUMMARY_CY = SUMMARY.y + SUMMARY.h / 2;
const WALL_CX = WALL.x + ((WALL.cols - 1) * WALL.colPitch + 20) / 2;

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
const COLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

/** Fixed token texture — deterministic "code" shapes, no randomness. */
const TOKEN_WIDTHS = [24, 14, 20, 26, 12, 22, 16, 25, 18, 13, 23, 21, 15, 26, 17, 20] as const;
const TOKEN_ALPHAS = [0.9, 0.55, 1, 0.7, 0.6, 0.95, 0.75, 0.5] as const;

/** The four dash-lines of the structured summary. */
const DASH_LINES = [
  { y: 408, len: 136 },
  { y: 432, len: 104 },
  { y: 456, len: 124 },
  { y: 480, len: 84 },
] as const;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/** Mechanical ease for the row collapse — no imports, scrub-safe. */
function smoothstep(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

export function TldrHero({ progress, active, accent, reduced }: HeroProps) {
  const wallLabel = useTransform(progress, [0.05, 0.12, 0.32, 0.42], [0, 1, 1, 0]);

  // Summary block: scales up while the wall pours into it.
  const summaryScale = useTransform(progress, [0.3, 0.55], [0.6, 1]);
  const summaryIn = useTransform(progress, [0.3, 0.4], [0, 1]);
  const glow = useTransform(progress, [0.45, 0.85], [0, 1]);
  // oklch strokes can't interpolate — crossfade ghost border out, accent in.
  const ghostBorder = useTransform(progress, [0.85, 0.93], [1, 0]);
  const accentBorder = useTransform(progress, [0.85, 0.93], [0, 1]);

  // Token bill: three stacked labels, opacity crossfade only.
  const count1 = useTransform(progress, [0.4, 0.46, 0.55, 0.6], [0, 1, 1, 0]);
  const count2 = useTransform(progress, [0.55, 0.6, 0.65, 0.7], [0, 1, 1, 0]);
  const count3 = useTransform(progress, [0.65, 0.7], [0, 1]);

  // What's left of the wall: a faint dashed outline.
  const ghostWall = useTransform(progress, [0.7, 0.82], [0, 0.75]);
  const tldrLabel = useTransform(progress, [0.34, 0.44], [0, 1]);
  const endLabel = useTransform(progress, [0.9, 0.97], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="tldr-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* glow behind the summary block */}
      <motion.circle
        cx={SUMMARY_CX}
        cy={SUMMARY_CY}
        r={150}
        fill="url(#tldr-glow)"
        style={{ opacity: glow }}
      />

      {/* ghost outline where the wall stood */}
      <motion.rect
        x={WALL.x - 8}
        y={WALL.y - 10}
        width={(WALL.cols - 1) * WALL.colPitch + 26 + 16}
        height={(WALL.rows - 1) * WALL.rowPitch + WALL.cellH + 20}
        rx={10}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        strokeDasharray="8 12"
        style={{ opacity: ghostWall }}
      />
      <motion.text
        x={WALL_CX}
        y={242}
        textAnchor="middle"
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: ghostWall }}
      >
        unread, unpaid
      </motion.text>

      {/* the token wall — one motion group per row, hooks live in TokenRow */}
      {ROWS.map((row) => (
        <TokenRow key={row} row={row} progress={progress} />
      ))}
      <motion.text
        x={WALL.x}
        y={94}
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: wallLabel }}
      >
        raw repo context
      </motion.text>

      {/* structured summary block */}
      <motion.g style={{ scale: summaryScale, opacity: summaryIn }}>
        <rect
          x={SUMMARY.x}
          y={SUMMARY.y}
          width={SUMMARY.w}
          height={SUMMARY.h}
          rx={12}
          fill={GHOST_FILL}
        />
        <motion.rect
          x={SUMMARY.x}
          y={SUMMARY.y}
          width={SUMMARY.w}
          height={SUMMARY.h}
          rx={12}
          fill="none"
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
          style={{ opacity: ghostBorder }}
        />
        <motion.rect
          x={SUMMARY.x}
          y={SUMMARY.y}
          width={SUMMARY.w}
          height={SUMMARY.h}
          rx={12}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          style={{ opacity: accentBorder }}
          animate={active && !reduced ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {DASH_LINES.map((line, i) => (
          <SummaryLine key={line.y} index={i} progress={progress} accent={accent} />
        ))}
      </motion.g>

      {/* header row above the block: tl;dr + the shrinking token bill */}
      <motion.text
        x={SUMMARY.x}
        y={358}
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: tldrLabel }}
      >
        tl;dr
      </motion.text>
      <motion.text
        x={SUMMARY.x + SUMMARY.w}
        y={358}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: count1 }}
      >
        14,200 tok
      </motion.text>
      <motion.text
        x={SUMMARY.x + SUMMARY.w}
        y={358}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: count2 }}
      >
        3,400 tok
      </motion.text>
      <motion.text
        x={SUMMARY.x + SUMMARY.w}
        y={358}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: count3 }}
      >
        380 tok
      </motion.text>

      {/* resolution */}
      <motion.text
        x={SUMMARY.x + SUMMARY.w}
        y={548}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: endLabel }}
      >
        same context · 2.6% of the tokens
      </motion.text>
    </svg>
  );
}

/**
 * One row of the token wall: 16 static rects inside a single motion group.
 * Draw-in is a staggered fade; the collapse translates the whole row toward
 * the summary block's center while it shrinks and fades — transform +
 * opacity only, so scrubbing stays cheap and reversible.
 */
function TokenRow({ row, progress }: { row: number; progress: MotionValue<number> }) {
  const rowY = WALL.y + row * WALL.rowPitch;
  const start = 0.3 + row * 0.028;
  const dx = SUMMARY_CX - WALL_CX;
  const dy = SUMMARY_CY - (rowY + WALL.cellH / 2);

  const drawIn = useTransform(progress, [0.02 + row * 0.016, 0.09 + row * 0.016], [0, 1]);
  const travel = useTransform(progress, (p) => smoothstep((p - start) / 0.12));
  const x = useTransform(travel, (t) => t * dx);
  const y = useTransform(travel, (t) => t * dy);
  const scale = useTransform(travel, (t) => 1 - 0.7 * t);
  const fade = useTransform(progress, [start + 0.04, start + 0.12], [1, 0]);
  const opacity = useTransform(() => drawIn.get() * fade.get());

  return (
    <motion.g style={{ x, y, scale, opacity }}>
      {COLS.map((col) => (
        <rect
          key={col}
          x={WALL.x + col * WALL.colPitch}
          y={rowY}
          width={TOKEN_WIDTHS[(col + row * 5) % TOKEN_WIDTHS.length]}
          height={WALL.cellH}
          rx={4}
          fill={GHOST_FILL}
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
          opacity={TOKEN_ALPHAS[(col * 3 + row) % TOKEN_ALPHAS.length]}
        />
      ))}
    </motion.g>
  );
}

/** One dash-line of the summary, drawn in with pathLength as the wall pours in. */
function SummaryLine({
  index,
  progress,
  accent,
}: {
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const draw = useTransform(progress, [0.38 + index * 0.045, 0.5 + index * 0.045], [0, 1]);
  const line = DASH_LINES[index];
  return (
    <motion.line
      x1={SUMMARY.x + 22}
      y1={line.y}
      x2={SUMMARY.x + 22 + line.len}
      y2={line.y}
      stroke={accent}
      strokeWidth={2}
      strokeLinecap="round"
      style={{ pathLength: draw }}
    />
  );
}
