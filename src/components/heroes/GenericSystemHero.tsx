import { motion, useTransform } from "framer-motion";

import { GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * Fallback scene for posts without a bespoke hero: a plain pipeline —
 * input → process → output — drawing in and passing one signal through.
 */

const STAGES = [180, 450, 720] as const;
const Y = 300;

export function GenericSystemHero({ progress, accent }: HeroProps) {
  const structure = useTransform(progress, [0.02, 0.2], [0, 1]);
  const signalT = useTransform(progress, [0.3, 0.85], [0, 1]);
  const signalX = useTransform(signalT, (t) => STAGES[0] + (STAGES[2] - STAGES[0]) * t);
  const signalOn = useTransform(progress, [0.28, 0.32, 0.92, 0.98], [0, 1, 1, 0]);
  const outputOn = useTransform(progress, [0.86, 0.94], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {STAGES.map((x, i) => (
        <motion.g key={x} style={{ opacity: structure }}>
          <rect
            x={x - 54}
            y={Y - 40}
            width={108}
            height={80}
            rx={8}
            fill="none"
            stroke={GHOST_STROKE}
            strokeWidth={1.5}
          />
          <text x={x} y={Y + 76} textAnchor="middle" fill={GHOST_STROKE} style={LABEL_STYLE}>
            {["input", "process", "output"][i]}
          </text>
        </motion.g>
      ))}
      <motion.line
        x1={STAGES[0] + 54}
        y1={Y}
        x2={STAGES[1] - 54}
        y2={Y}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: structure }}
      />
      <motion.line
        x1={STAGES[1] + 54}
        y1={Y}
        x2={STAGES[2] - 54}
        y2={Y}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: structure }}
      />
      <motion.circle cy={Y} r={5} fill={accent} style={{ cx: signalX, opacity: signalOn }} />
      <motion.rect
        x={STAGES[2] - 54}
        y={Y - 40}
        width={108}
        height={80}
        rx={8}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: outputOn }}
      />
    </svg>
  );
}
