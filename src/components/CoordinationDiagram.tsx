import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase =
  | "idle"
  | "request"
  | "race"
  | "register"
  | "compute"
  | "write"
  | "notify"
  | "wake";

type Frame = {
  name: Phase;
  duration: number;
  title: string;
  short: string;
  caption: string;
};

const FRAMES: Frame[] = [
  {
    name: "idle",
    duration: 1200,
    title: "idle",
    short: "idle",
    caption: "Three containers, one missing key K, an empty Dict.",
  },
  {
    name: "request",
    duration: 1400,
    title: "concurrent get(K)",
    short: "request",
    caption: "A, B and C all call get(K). Each one calls put(lock(K), skip_if_exists=True).",
  },
  {
    name: "race",
    duration: 1300,
    title: "race resolved",
    short: "race",
    caption: "Modal Dict makes the put atomic. A wins the lock. B and C take the waiter path.",
  },
  {
    name: "register",
    duration: 1600,
    title: "register + block",
    short: "block",
    caption:
      "B and C append themselves to lock.waiters, then block on queue.get(partition=waiter_id).",
  },
  {
    name: "compute",
    duration: 2400,
    title: "compute_fn() runs",
    short: "compute",
    caption: "A runs the expensive work. B and C are asleep on their own Queue partitions.",
  },
  {
    name: "write",
    duration: 1200,
    title: "write result(K)",
    short: "write",
    caption: "A finishes and writes the value into Modal Dict.",
  },
  {
    name: "notify",
    duration: 1700,
    title: "fan-out notify",
    short: "notify",
    caption:
      "A iterates lock.waiters and puts a tiny message on each waiter's Queue partition.",
  },
  {
    name: "wake",
    duration: 2000,
    title: "waiters wake",
    short: "wake",
    caption: "B and C unblock, read result(K), return. One compute, three returns.",
  },
];

type Pt = { x: number; y: number; visible?: boolean; pulse?: boolean };

// Token "home" positions — tokens are little dots that dock to the left of each card.
// Each token slot is a single fixed (x, y) per phase. No per-phase y overrides — keeps
// the spatial story consistent.
const NODES = {
  containerA: { x: 6, y: 22 },
  containerB: { x: 6, y: 50 },
  containerC: { x: 6, y: 78 },
  // tokens land in the upper-right of each slab row so they sit clear of the row labels
  dictPending: { x: 59, y: 23 },
  dictResult: { x: 59, y: 62 },
  queueB: { x: 91, y: 28 },
  queueC: { x: 91, y: 65 },
};

// Card render positions — actor cards are left-anchored to the right of their token.
const CARDS = {
  A: { x: 10, y: 22 },
  B: { x: 10, y: 50 },
  C: { x: 10, y: 78 },
};

// Request-phase "pile" positions: all three tokens converge at the dict's lock
// row with small vertical offsets so they read as "racing for the same slot".
const REQUEST_PILE = {
  A: { x: 59, y: 23 },
  B: { x: 59, y: 30 },
  C: { x: 59, y: 37 },
};

// Per-token (per phase) coordinates. x/y are percentages of the stage box.
const TOKEN_TRACKS: Record<string, Record<Phase, Pt>> = {
  A: {
    idle: { ...NODES.containerA, visible: true },
    request: { ...REQUEST_PILE.A, visible: true },
    race: { ...NODES.dictPending, visible: true },
    register: { ...NODES.dictPending, visible: true },
    compute: { ...NODES.dictPending, visible: true, pulse: true },
    write: { ...NODES.dictResult, visible: true },
    notify: { ...NODES.dictResult, visible: true },
    wake: { ...NODES.dictResult, visible: true },
  },
  B: {
    idle: { ...NODES.containerB, visible: true },
    request: { ...REQUEST_PILE.B, visible: true },
    race: { ...NODES.containerB, visible: true },
    register: { ...NODES.queueB, visible: true },
    compute: { ...NODES.queueB, visible: true },
    write: { ...NODES.queueB, visible: true },
    notify: { ...NODES.queueB, visible: true, pulse: true },
    wake: { ...NODES.containerB, visible: true },
  },
  C: {
    idle: { ...NODES.containerC, visible: true },
    request: { ...REQUEST_PILE.C, visible: true },
    race: { ...NODES.containerC, visible: true },
    register: { ...NODES.queueC, visible: true },
    compute: { ...NODES.queueC, visible: true },
    write: { ...NODES.queueC, visible: true },
    notify: { ...NODES.queueC, visible: true, pulse: true },
    wake: { ...NODES.containerC, visible: true },
  },
  // notification ping tokens — spawn at L2 during notify, travel to queue partitions
  notifyB: {
    idle: { ...NODES.dictResult, visible: false },
    request: { ...NODES.dictResult, visible: false },
    race: { ...NODES.dictResult, visible: false },
    register: { ...NODES.dictResult, visible: false },
    compute: { ...NODES.dictResult, visible: false },
    write: { ...NODES.dictResult, visible: false },
    notify: { ...NODES.queueB, visible: true },
    wake: { ...NODES.queueB, visible: false },
  },
  notifyC: {
    idle: { ...NODES.dictResult, visible: false },
    request: { ...NODES.dictResult, visible: false },
    race: { ...NODES.dictResult, visible: false },
    register: { ...NODES.dictResult, visible: false },
    compute: { ...NODES.dictResult, visible: false },
    write: { ...NODES.dictResult, visible: false },
    notify: { ...NODES.queueC, visible: true },
    wake: { ...NODES.queueC, visible: false },
  },
};

const TOTAL_DURATION = FRAMES.reduce((a, f) => a + f.duration, 0);

export function CoordinationDiagram() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);

  const phase = FRAMES[frameIndex].name;
  const currentFrame = FRAMES[frameIndex];

  // Advance frames on a timer
  useEffect(() => {
    if (!playing) return;
    const next = (frameIndex + 1) % FRAMES.length;
    timerRef.current = window.setTimeout(() => setFrameIndex(next), currentFrame.duration);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [playing, frameIndex, currentFrame.duration]);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const restart = useCallback(() => {
    setFrameIndex(0);
    setPlaying(true);
  }, []);

  // Compute the cumulative progress (0..1) of the loop based on frame index
  const cumulative = FRAMES.slice(0, frameIndex).reduce((a, f) => a + f.duration, 0);
  const progress = cumulative / TOTAL_DURATION;

  return (
    <figure className="coord-anim not-prose" aria-label="Distributed lock coordination animation">
      <header className="coord-anim__head">
        <div>
          <span className="coord-anim__eyebrow">{currentFrame.title}</span>
          <p className="coord-anim__caption">{currentFrame.caption}</p>
        </div>
        <div className="coord-anim__controls">
          <button
            type="button"
            className="coord-anim__btn"
            onClick={togglePlay}
            aria-label={playing ? "pause" : "play"}
          >
            {playing ? <Pause size={12} strokeWidth={2} /> : <Play size={12} strokeWidth={2} />}
            {playing ? "pause" : "play"}
          </button>
          <button type="button" className="coord-anim__btn" onClick={restart} aria-label="restart">
            <RotateCcw size={12} strokeWidth={2} /> restart
          </button>
        </div>
      </header>

      <div className="coord-anim__stage">
        {/* nodes — containers (left column) */}
        <Node
          className="coord-anim__node coord-anim__node--actor"
          x={CARDS.A.x}
          y={CARDS.A.y}
          anchor="left"
          active={phase === "compute" || phase === "write"}
        >
          <span className="coord-anim__node-label">container A</span>
          <span className="coord-anim__node-sub">{statusFor("A", phase)}</span>
        </Node>
        <Node
          className="coord-anim__node coord-anim__node--actor"
          x={CARDS.B.x}
          y={CARDS.B.y}
          anchor="left"
          active={phase === "wake"}
        >
          <span className="coord-anim__node-label">container B</span>
          <span className="coord-anim__node-sub">{statusFor("B", phase)}</span>
        </Node>
        <Node
          className="coord-anim__node coord-anim__node--actor"
          x={CARDS.C.x}
          y={CARDS.C.y}
          anchor="left"
          active={phase === "wake"}
        >
          <span className="coord-anim__node-label">container C</span>
          <span className="coord-anim__node-sub">{statusFor("C", phase)}</span>
        </Node>

        {/* L2 Dict slab */}
        <Slab
          className="coord-anim__slab coord-anim__slab--dict"
          x={38}
          y={10}
          width={24}
          height={80}
          title="L2 · Modal Dict"
          active={phase === "race" || phase === "compute" || phase === "write" || phase === "notify"}
        >
          <SlabRow label="lock(K)" active={phase === "race" || phase === "register" || phase === "compute"}>
            {phase === "race" || phase === "register" || phase === "compute" ? "holder=A, waiters=[B,C]" : "—"}
          </SlabRow>
          <SlabRow
            label="result(K)"
            active={phase === "write" || phase === "notify" || phase === "wake"}
            highlight={phase === "write"}
          >
            {phase === "write" || phase === "notify" || phase === "wake" ? "value" : "—"}
          </SlabRow>
        </Slab>

        {/* Modal Queue slab */}
        <Slab
          className="coord-anim__slab coord-anim__slab--queue"
          x={70}
          y={15}
          width={24}
          height={72}
          title="Modal Queue"
          active={phase === "register" || phase === "notify" || phase === "wake"}
        >
          <SlabRow
            label="partition B"
            active={phase === "register" || phase === "compute" || phase === "write" || phase === "notify"}
            highlight={phase === "notify"}
          >
            {phase === "register" || phase === "compute" || phase === "write"
              ? "blocking get()"
              : phase === "notify"
              ? "← put(notify)"
              : "—"}
          </SlabRow>
          <SlabRow
            label="partition C"
            active={phase === "register" || phase === "compute" || phase === "write" || phase === "notify"}
            highlight={phase === "notify"}
          >
            {phase === "register" || phase === "compute" || phase === "write"
              ? "blocking get()"
              : phase === "notify"
              ? "← put(notify)"
              : "—"}
          </SlabRow>
        </Slab>

        {/* Animated tokens */}
        {Object.entries(TOKEN_TRACKS).map(([id, tracks]) => {
          const pt = tracks[phase];
          const variant = id.startsWith("notify") ? "notify" : id.toLowerCase();
          return (
            <span
              key={id}
              className={`coord-anim__token coord-anim__token--${variant}${pt.pulse ? " is-pulse" : ""}${
                !pt.visible ? " is-hidden" : ""
              }`}
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              aria-hidden
            >
              {id.startsWith("notify") ? "" : id}
            </span>
          );
        })}
      </div>

      <ol className="coord-anim__timeline">
        {FRAMES.map((f, i) => (
          <li
            key={f.name}
            className={`coord-anim__step${i === frameIndex ? " is-active" : ""}${
              i < frameIndex ? " is-done" : ""
            }`}
            style={{ flex: f.duration }}
          >
            <button
              type="button"
              className="coord-anim__step-btn"
              onClick={() => {
                setFrameIndex(i);
                setPlaying(false);
              }}
            >
              <span className="coord-anim__step-index">{String(i + 1).padStart(2, "0")}</span>
              <span className="coord-anim__step-title">{f.short}</span>
            </button>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function Node({
  x,
  y,
  active,
  className,
  anchor,
  children,
}: {
  x: number;
  y: number;
  active?: boolean;
  className?: string;
  anchor?: "center" | "left";
  children: React.ReactNode;
}) {
  const anchorClass = anchor === "left" ? " coord-anim__node--left" : "";
  return (
    <div
      className={`${className ?? ""}${active ? " is-active" : ""}${anchorClass}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </div>
  );
}

function statusFor(id: "A" | "B" | "C", phase: Phase): string {
  if (id === "A") {
    if (phase === "compute" || phase === "write" || phase === "notify") return "holder";
    if (phase === "wake") return "value";
    return "get(K)";
  }
  if (phase === "register" || phase === "compute" || phase === "write" || phase === "notify") {
    return "blocking";
  }
  if (phase === "wake") return "value";
  return "get(K)";
}

function Slab({
  x,
  y,
  width,
  height,
  title,
  active,
  className,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${className ?? ""}${active ? " is-active" : ""}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    >
      <span className="coord-anim__slab-title">{title}</span>
      <div className="coord-anim__slab-body">{children}</div>
    </div>
  );
}

function SlabRow({
  label,
  active,
  highlight,
  children,
}: {
  label: string;
  active?: boolean;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`coord-anim__slab-row${active ? " is-active" : ""}${highlight ? " is-highlight" : ""}`}
    >
      <span className="coord-anim__slab-row-label">{label}</span>
      <span className="coord-anim__slab-row-value">{children}</span>
    </div>
  );
}
