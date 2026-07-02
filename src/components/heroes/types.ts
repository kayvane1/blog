import type { MotionValue } from "framer-motion";

/**
 * Contract for a chapter hero: the full-viewport schematic animation behind a
 * post's panel on the homepage deck.
 *
 * - `progress` is the scrubbed narrative position, 0 → 1, driven by scroll
 *   through the chapter. Derive every narrative beat from it with
 *   `useTransform` so scrolling backwards replays in reverse.
 * - `active` is true while the chapter is the front pinned panel. Gate idle
 *   loops (pulses, blinking cursors) on it so off-screen scenes cost nothing.
 * - `accent` is the chapter's oklch color string. Structure lines use dim
 *   ghost strokes; only the "live" elements of the system get the accent.
 * - `reduced` mirrors prefers-reduced-motion: render the resolved end state
 *   (as if progress were 1) and run no idle loops.
 */
export type HeroProps = {
  progress: MotionValue<number>;
  active: boolean;
  accent: string;
  reduced: boolean;
};

/** Dim structural stroke used for the non-live parts of every schematic. */
export const GHOST_STROKE = "oklch(0.96 0.005 265 / 0.22)";

/** Fainter fill for structural surfaces. */
export const GHOST_FILL = "oklch(0.96 0.005 265 / 0.07)";

/** Mono label styling shared by every hero's SVG text. */
export const LABEL_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
} as const;
