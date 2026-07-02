import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "Building a mini game with GPT-5.2-Codex, Suno and GPT Image Gen"
 *
 * A Farkle throw resolving. Six dice tumble through fixed face sequences and
 * settle one at a time, left to right; scoring faces (1s and 5s) light up
 * with an accent ring and a score tick, the lone 3 stays ghost, and the
 * running total tallies up to the player's real decision: bank or roll?
 *
 * Narrative beats over `progress`:
 *   0.02–0.15  six die outlines draw in, each resting at its throw tilt
 *   0.18–0.70  the roll: dice tumble through fixed angle + face sequences,
 *              settling one at a time, staggered left to right
 *   [settles]  each scoring die gains an accent ring and a +100/+50 tick;
 *              the non-scoring 3 dims to ghost
 *   0.85–1.00  running total crossfades +100 → +350 → +450, then the
 *              verdict: "450 · bank or roll?"
 */

const DICE = [0, 1, 2, 3, 4, 5] as const;

/** Grid: two rows of three, center-right. Dice are 90×90 in local coords. */
const COLS = [440, 560, 680] as const;
const ROWS = [200, 336] as const;
const HALF = 45;

/** Final resolved faces — three 1s, two 5s, one dead 3. */
const FINAL = [1, 5, 1, 1, 5, 3] as const;

/** Fixed tumble sequences: each die crossfades through three faces → final. */
const FACE_SEQ = [
  [3, 6, 2, 1],
  [4, 2, 6, 5],
  [6, 3, 4, 1],
  [2, 5, 3, 1],
  [6, 1, 2, 5],
  [5, 4, 6, 3],
] as const;

/** Fixed rotation sequences (degrees), all resolving to 0 at settle. */
const ANGLES = [
  [-14, 10, -6, 0],
  [12, -9, 5, 0],
  [-10, 13, -5, 0],
  [9, -12, 6, 0],
  [-13, 8, -7, 0],
  [11, -8, 4, 0],
] as const;

/** Fixed vertical hops (viewBox units) keyed to the same tumble times. */
const HOPS = [
  [0, -14, 6, 0],
  [0, -10, 5, 0],
  [0, -15, 7, 0],
  [0, -11, 5, 0],
  [0, -13, 6, 0],
  [0, -9, 4, 0],
] as const;

/** Per-die roll windows: staggered starts, settles one at a time L → R. */
const ROLL_START = [0.18, 0.21, 0.24, 0.27, 0.3, 0.33] as const;
const SETTLE = [0.42, 0.472, 0.524, 0.576, 0.628, 0.68] as const;

/** Idle wobble periods — varied so the six dice never sync up. */
const WOBBLE_DUR = [2.6, 3.1, 2.8, 3.4, 2.5, 3.0] as const;

/** Hardcoded pip layouts per face value, in die-local coords. */
const PIP = 22;
const PIPS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[0, 0]],
  2: [
    [-PIP, -PIP],
    [PIP, PIP],
  ],
  3: [
    [-PIP, -PIP],
    [0, 0],
    [PIP, PIP],
  ],
  4: [
    [-PIP, -PIP],
    [PIP, -PIP],
    [-PIP, PIP],
    [PIP, PIP],
  ],
  5: [
    [-PIP, -PIP],
    [PIP, -PIP],
    [0, 0],
    [-PIP, PIP],
    [PIP, PIP],
  ],
  6: [
    [-PIP, -PIP],
    [PIP, -PIP],
    [-PIP, 0],
    [PIP, 0],
    [-PIP, PIP],
    [PIP, PIP],
  ],
};

export function DiceRollHero({ progress, active, accent, reduced }: HeroProps) {
  const structure = useTransform(progress, [0.02, 0.12], [0, 1]);
  const glow = useTransform(progress, [0.82, 0.92], [0, 0.55]);

  // Running total: fixed labels crossfading at one anchor point.
  const plus100 = useTransform(progress, [0.85, 0.87, 0.89, 0.91], [0, 1, 1, 0]);
  const plus350 = useTransform(progress, [0.89, 0.91, 0.93, 0.95], [0, 1, 1, 0]);
  const plus450 = useTransform(progress, [0.93, 0.95, 0.96, 0.975], [0, 1, 1, 0]);
  const verdict = useTransform(progress, [0.96, 0.99], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="dr-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* warm glow behind the resolved throw */}
      <motion.circle cx={560} cy={268} r={240} fill="url(#dr-glow)" style={{ opacity: glow }} />

      <motion.text x={82} y={72} fill={GHOST_STROKE} style={{ ...LABEL_STYLE, opacity: structure }}>
        farkle · one throw
      </motion.text>

      {DICE.map((i) => (
        <Die
          key={i}
          index={i}
          progress={progress}
          accent={accent}
          active={active}
          reduced={reduced}
        />
      ))}

      {/* running total: crossfading fixed labels, then the verdict */}
      <motion.text
        x={560}
        y={462}
        textAnchor="middle"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: plus100 }}
      >
        +100
      </motion.text>
      <motion.text
        x={560}
        y={462}
        textAnchor="middle"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: plus350 }}
      >
        +350
      </motion.text>
      <motion.text
        x={560}
        y={462}
        textAnchor="middle"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: plus450 }}
      >
        +450
      </motion.text>
      <motion.text
        x={560}
        y={462}
        textAnchor="middle"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: verdict }}
      >
        450 · bank or roll?
      </motion.text>
    </svg>
  );
}

function Die({
  index,
  progress,
  accent,
  active,
  reduced,
}: {
  index: number;
  progress: MotionValue<number>;
  accent: string;
  active: boolean;
  reduced: boolean;
}) {
  const x = COLS[index % 3];
  const y = ROWS[index < 3 ? 0 : 1];
  const face = FINAL[index];
  const scoring = face === 1 || face === 5;
  const t0 = ROLL_START[index];
  const t1 = SETTLE[index];
  const w = t1 - t0;

  // Outline draws in first, tilted at the die's opening throw angle.
  const draw = useTransform(progress, [0.02 + index * 0.012, 0.09 + index * 0.012], [0, 1]);

  // The tumble: fixed angle/hop sequences resolving to rest at settle time.
  const tumbleTimes = [t0, t0 + w * 0.35, t0 + w * 0.7, t1];
  const rotate = useTransform(progress, tumbleTimes, [...ANGLES[index]]);
  const hop = useTransform(progress, tumbleTimes, [...HOPS[index]]);
  const pop = useTransform(progress, [t1 - 0.01, t1 + 0.015, t1 + 0.045], [1, 1.05, 1]);

  // Non-scoring die fades to ghost after it lands; scoring dice hold full.
  const dim = useTransform(progress, [t1, t1 + 0.08], [1, scoring ? 1 : 0.45]);
  const dieOpacity = useTransform(() => draw.get() * dim.get());

  // Settle rewards: accent ring + score tick rising into place.
  const ring = useTransform(progress, [t1, t1 + 0.04], [0, 1]);
  const rise = useTransform(progress, [t1, t1 + 0.06], [8, 0]);

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* accent ring: axis-aligned, appears the moment the die rests at 0° */}
      {scoring && (
        <motion.rect
          x={-HALF - 4}
          y={-HALF - 4}
          width={2 * HALF + 8}
          height={2 * HALF + 8}
          rx={16}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          style={{ opacity: ring }}
        />
      )}

      <motion.g style={{ opacity: dieOpacity }}>
        <motion.g
          style={{
            rotate,
            y: hop,
            scale: pop,
            transformBox: "fill-box",
            transformOrigin: "center",
          }}
        >
          {/* idle wobble rides on top of the scrubbed tumble */}
          <motion.g
            animate={
              active && !reduced
                ? { rotate: index % 2 === 0 ? [-2, 2, -2] : [2, -2, 2] }
                : { rotate: 0 }
            }
            transition={{ duration: WOBBLE_DUR[index], repeat: Infinity, ease: "easeInOut" }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            <motion.rect
              x={-HALF}
              y={-HALF}
              width={2 * HALF}
              height={2 * HALF}
              rx={14}
              fill={GHOST_FILL}
              stroke={GHOST_STROKE}
              strokeWidth={2.5}
              style={{ pathLength: draw, fillOpacity: draw }}
            />
            {FACE_SEQ[index].map((value, k) => (
              <Face
                key={k}
                value={value}
                k={k}
                t0={t0}
                t1={t1}
                progress={progress}
                outlined={k < 3}
                fill={scoring ? accent : GHOST_STROKE}
              />
            ))}
          </motion.g>
        </motion.g>
      </motion.g>

      {/* score tick above the die (counts as one label group across dice) */}
      {scoring && (
        <motion.text
          x={0}
          y={-HALF - 19}
          textAnchor="middle"
          fill={accent}
          style={{ ...LABEL_STYLE, opacity: ring, y: rise }}
        >
          {face === 1 ? "+100" : "+50"}
        </motion.text>
      )}
    </g>
  );
}

/**
 * One pip-face of the tumble. The roll window splits into four equal segments;
 * face k owns segment k and crossfades in/out via opacity. The final face
 * (k = 3) fades in during the last segment and stays.
 */
function Face({
  value,
  k,
  t0,
  t1,
  progress,
  outlined,
  fill,
}: {
  value: number;
  k: number;
  t0: number;
  t1: number;
  progress: MotionValue<number>;
  outlined: boolean;
  fill: string;
}) {
  const seg = (t1 - t0) / 4;
  const fade = 0.012;
  const s = t0 + k * seg;
  const isFinal = k === 3;
  const opacity = useTransform(
    progress,
    isFinal ? [s, s + fade] : [s, s + fade, s + seg - fade, s + seg],
    isFinal ? [0, 1] : [0, 1, 1, 0],
  );

  return (
    <motion.g style={{ opacity }}>
      {PIPS[value].map(([px, py], j) => (
        <circle
          key={j}
          cx={px}
          cy={py}
          r={7}
          fill={outlined ? GHOST_FILL : fill}
          stroke={outlined ? GHOST_STROKE : "none"}
          strokeWidth={outlined ? 1.5 : 0}
        />
      ))}
    </motion.g>
  );
}
