import { motion, useTransform } from "framer-motion";

import type { MotionValue } from "framer-motion";

import { GHOST_FILL, GHOST_STROKE, LABEL_STYLE, type HeroProps } from "./types";

/**
 * "Skill orchestrations, and what I like about pstack"
 *
 * A three-layer skill stack routes a request: the workflow picks one
 * playbook, the playbook's steps cite principle leaves, and every child the
 * work fans out to passes through one wrapper gate. At the end a new
 * principle buds — the layer you extend as the system learns.
 *
 * Narrative beats over `progress`:
 *   0.02–0.18  the stack draws in (workflow, playbooks, principles)
 *   0.20–0.36  a request drops in; the router lights one playbook, dims two
 *   0.36–0.52  the playbook's steps tick; cited principles ring up
 *   0.50–0.79  fan-out: three children funnel through the single wrapper
 *              ring, then spread to their work
 *   0.80–1.00  a dashed loop returns from the work to a budding principle —
 *              "route · fan out · learn"
 */

const WORKFLOW = { x: 450, y: 84, r: 22 } as const;
const PLAYBOOK_XS = [250, 450, 650] as const;
const PLAYBOOK = { y: 196, hw: 64, hh: 23 } as const;
const CHOSEN = 1;
const LEAF_XS = [170, 246, 322, 398, 474, 550] as const;
const LEAF = { y: 312, r: 11 } as const;
const CITED = [1, 3] as const;
const BUD = { x: 626, y: 312 } as const;
const WRAPPER = { x: 700, y: 392, r: 16 } as const;
const WORKER_XS = [610, 700, 790] as const;
const WORKER = { y: 486, hw: 23, hh: 20 } as const;
const CHILD_STARTS = [0.55, 0.585, 0.62] as const;
const CHILD_SEG1 = 0.08;
const CHILD_SEG2 = 0.06;

export function SkillStackHero({ progress, active, accent, reduced }: HeroProps) {
  const workflowIn = useTransform(progress, [0.02, 0.08], [0, 1]);
  const tierLabels = useTransform(progress, [0.1, 0.18], [0, 1]);

  // Request drops from above into the workflow node.
  const requestY = useTransform(progress, [0.2, 0.26], [16, WORKFLOW.y - WORKFLOW.r - 8]);
  const requestOn = useTransform(progress, [0.19, 0.21, 0.26, 0.28], [0, 1, 1, 0]);
  const routerBlip = useTransform(progress, [0.25, 0.28, 0.33], [0, 1, 0]);

  // The routed edge lights; the chosen playbook takes the accent.
  const routeOn = useTransform(progress, [0.26, 0.32], [0, 1]);

  // Wrapper gate: draws once, then blips as each child passes through.
  const wrapperIn = useTransform(progress, [0.5, 0.56], [0, 1]);
  const wrapperBlip = useTransform(
    progress,
    [0.6, 0.625, 0.65, 0.66, 0.685, 0.695, 0.72, 0.75],
    [0, 1, 0.35, 1, 0.35, 1, 0.35, 0],
  );

  // The learning loop: work feeds a new principle.
  const loopDraw = useTransform(progress, [0.8, 0.88], [0, 1]);
  const budGhost = useTransform(progress, [0.84, 0.9, 0.92], [0, 1, 0]);
  const budAccent = useTransform(progress, [0.9, 0.96], [0, 1]);
  const budR = useTransform(progress, [0.84, 0.92], [4, LEAF.r]);
  const endLabel = useTransform(progress, [0.9, 0.97], [0, 1]);

  return (
    <svg
      viewBox="0 0 900 600"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="ss-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* request in flight */}
      <motion.circle
        cx={WORKFLOW.x}
        r={5}
        fill={accent}
        style={{ cy: requestY, opacity: requestOn }}
      />

      {/* workflow node */}
      <motion.g style={{ opacity: workflowIn }}>
        <circle
          cx={WORKFLOW.x}
          cy={WORKFLOW.y}
          r={WORKFLOW.r}
          fill={GHOST_FILL}
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
        />
        <text
          x={WORKFLOW.x - WORKFLOW.r - 14}
          y={WORKFLOW.y + 4}
          textAnchor="end"
          fill={GHOST_STROKE}
          style={LABEL_STYLE}
        >
          workflow
        </text>
      </motion.g>
      <motion.circle
        cx={WORKFLOW.x}
        cy={WORKFLOW.y}
        r={WORKFLOW.r}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: routerBlip }}
      />

      {/* playbook tier */}
      {PLAYBOOK_XS.map((x, i) => (
        <Playbook key={x} x={x} index={i} progress={progress} accent={accent} />
      ))}
      <motion.text
        x={PLAYBOOK_XS[0] - PLAYBOOK.hw}
        y={PLAYBOOK.y - PLAYBOOK.hh - 12}
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: tierLabels }}
      >
        playbooks
      </motion.text>

      {/* routed edge on top of the ghost edge */}
      <motion.line
        x1={WORKFLOW.x}
        y1={WORKFLOW.y + WORKFLOW.r}
        x2={PLAYBOOK_XS[CHOSEN]}
        y2={PLAYBOOK.y - PLAYBOOK.hh}
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: routeOn }}
      />

      {/* step ticks inside the chosen playbook */}
      {[0, 1, 2, 3].map((i) => (
        <StepTick key={i} index={i} progress={progress} accent={accent} />
      ))}

      {/* principle tier */}
      {LEAF_XS.map((x, i) => (
        <Leaf key={x} x={x} index={i} progress={progress} accent={accent} />
      ))}
      <motion.text
        x={LEAF_XS[0] - LEAF.r}
        y={LEAF.y + 36}
        fill={GHOST_STROKE}
        style={{ ...LABEL_STYLE, opacity: tierLabels }}
      >
        principles
      </motion.text>

      {/* wrapper gate */}
      <motion.g style={{ opacity: wrapperIn }}>
        <circle
          cx={WRAPPER.x}
          cy={WRAPPER.y}
          r={WRAPPER.r}
          fill={GHOST_FILL}
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
        />
        <text
          x={WRAPPER.x + WRAPPER.r + 12}
          y={WRAPPER.y + 4}
          fill={GHOST_STROKE}
          style={LABEL_STYLE}
        >
          wrapper
        </text>
      </motion.g>
      <motion.circle
        cx={WRAPPER.x}
        cy={WRAPPER.y}
        r={34}
        fill="url(#ss-glow)"
        style={{ opacity: wrapperBlip }}
      />
      <motion.circle
        cx={WRAPPER.x}
        cy={WRAPPER.y}
        r={WRAPPER.r}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: wrapperBlip }}
      />

      {/* fan-out children + their work */}
      {WORKER_XS.map((x, i) => (
        <ChildLane key={x} workerX={x} index={i} progress={progress} accent={accent} />
      ))}

      {/* the learning loop: work → new principle */}
      <motion.path
        d={`M ${WORKER_XS[2]} ${WORKER.y - WORKER.hh - 6} Q 856 300 ${BUD.x + LEAF.r + 8} ${BUD.y}`}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        strokeDasharray="8 10"
        style={{ pathLength: loopDraw }}
      />
      <motion.circle
        cx={BUD.x}
        cy={BUD.y}
        fill="none"
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        strokeDasharray="5 5"
        style={{ r: budR, opacity: budGhost }}
      />
      <motion.circle
        cx={BUD.x}
        cy={BUD.y}
        r={LEAF.r}
        fill={GHOST_FILL}
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: budAccent }}
        animate={active && !reduced ? { scale: [1, 1.09, 1] } : { scale: 1 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.text
        x={826}
        y={568}
        textAnchor="end"
        fill={accent}
        style={{ ...LABEL_STYLE, opacity: endLabel }}
      >
        route · fan out · learn
      </motion.text>
    </svg>
  );
}

function Playbook({
  x,
  index,
  progress,
  accent,
}: {
  x: number;
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const chosen = index === CHOSEN;
  const draw = useTransform(progress, [0.05 + index * 0.025, 0.13 + index * 0.025], [0, 1]);
  // The two roads not taken dim once the router commits.
  const dim = useTransform(progress, [0.3, 0.36], [1, chosen ? 1 : 0.35]);
  const groupO = useTransform(() => draw.get() * dim.get());
  const accentBorder = useTransform(progress, [0.3, 0.36], [0, chosen ? 1 : 0]);

  return (
    <g>
      <motion.g style={{ opacity: groupO }}>
        <line
          x1={WORKFLOW.x}
          y1={WORKFLOW.y + WORKFLOW.r}
          x2={x}
          y2={PLAYBOOK.y - PLAYBOOK.hh}
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
        />
        <rect
          x={x - PLAYBOOK.hw}
          y={PLAYBOOK.y - PLAYBOOK.hh}
          width={PLAYBOOK.hw * 2}
          height={PLAYBOOK.hh * 2}
          rx={8}
          fill={GHOST_FILL}
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
        />
      </motion.g>
      <motion.rect
        x={x - PLAYBOOK.hw}
        y={PLAYBOOK.y - PLAYBOOK.hh}
        width={PLAYBOOK.hw * 2}
        height={PLAYBOOK.hh * 2}
        rx={8}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        style={{ opacity: accentBorder }}
      />
    </g>
  );
}

function StepTick({
  index,
  progress,
  accent,
}: {
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const at = 0.36 + index * 0.035;
  const on = useTransform(progress, [at, at + 0.03], [0, 1]);
  return (
    <motion.rect
      x={PLAYBOOK_XS[CHOSEN] - 46 + index * 26}
      y={PLAYBOOK.y - 3}
      width={18}
      height={6}
      rx={3}
      fill={accent}
      style={{ opacity: on }}
    />
  );
}

function Leaf({
  x,
  index,
  progress,
  accent,
}: {
  x: number;
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const citedAt = CITED.indexOf(index as (typeof CITED)[number]);
  const draw = useTransform(progress, [0.08 + index * 0.015, 0.16 + index * 0.015], [0, 1]);
  const citeT = 0.4 + citedAt * 0.05;
  const cite = useTransform(progress, citedAt === -1 ? [0, 1] : [citeT, citeT + 0.08], [
    0,
    citedAt === -1 ? 0 : 1,
  ]);

  return (
    <g>
      <motion.circle
        cx={x}
        cy={LEAF.y}
        r={LEAF.r}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1.5}
        style={{ opacity: draw }}
      />
      {/* citation edge from the chosen playbook + accent ring */}
      <motion.g style={{ opacity: cite }}>
        <line
          x1={PLAYBOOK_XS[CHOSEN]}
          y1={PLAYBOOK.y + PLAYBOOK.hh}
          x2={x}
          y2={LEAF.y - LEAF.r - 2}
          stroke={accent}
          strokeWidth={1.5}
        />
        <circle cx={x} cy={LEAF.y} r={LEAF.r + 4} fill="none" stroke={accent} strokeWidth={2} />
      </motion.g>
    </g>
  );
}

function ChildLane({
  workerX,
  index,
  progress,
  accent,
}: {
  workerX: number;
  index: number;
  progress: MotionValue<number>;
  accent: string;
}) {
  const t0 = CHILD_STARTS[index];
  const t1 = t0 + CHILD_SEG1; // reaches the wrapper
  const t2 = t1 + CHILD_SEG2; // reaches its work

  const from = { x: PLAYBOOK_XS[CHOSEN] + 20, y: PLAYBOOK.y + PLAYBOOK.hh } as const;
  const cx = useTransform(progress, [t0, t1, t2], [from.x, WRAPPER.x, workerX]);
  const cy = useTransform(progress, [t0, t1, t2], [from.y, WRAPPER.y, WORKER.y - WORKER.hh - 6]);
  const dotOn = useTransform(progress, [t0, t0 + 0.01, t2, t2 + 0.015], [0, 1, 1, 0]);
  const workerIn = useTransform(progress, [t2 - 0.01, t2 + 0.04], [0, 1]);
  const workerFill = useTransform(progress, [t2 + 0.02, t2 + 0.06], [0, 0.5]);

  return (
    <g>
      <motion.circle r={5} fill={accent} style={{ cx, cy, opacity: dotOn }} />
      <motion.g style={{ opacity: workerIn }}>
        <rect
          x={workerX - WORKER.hw}
          y={WORKER.y - WORKER.hh}
          width={WORKER.hw * 2}
          height={WORKER.hh * 2}
          rx={6}
          fill={GHOST_FILL}
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
        />
      </motion.g>
      <motion.rect
        x={workerX - WORKER.hw}
        y={WORKER.y - WORKER.hh}
        width={WORKER.hw * 2}
        height={WORKER.hh * 2}
        rx={6}
        fill={accent}
        stroke="none"
        style={{ opacity: workerFill }}
      />
    </g>
  );
}
