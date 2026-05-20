import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "request" | "race" | "register" | "compute" | "write" | "notify" | "wake";

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
    caption: "A iterates lock.waiters and puts a tiny message on each waiter's Queue partition.",
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

const NODES = {
  containerA: { x: 6, y: 22 },
  containerB: { x: 6, y: 50 },
  containerC: { x: 6, y: 78 },
  dictPending: { x: 59, y: 23 },
  dictResult: { x: 59, y: 62 },
  queueB: { x: 91, y: 28 },
  queueC: { x: 91, y: 65 },
};

const CARDS = {
  A: { x: 10, y: 22 },
  B: { x: 10, y: 50 },
  C: { x: 10, y: 78 },
};

const REQUEST_PILE = {
  A: { x: 59, y: 23 },
  B: { x: 59, y: 30 },
  C: { x: 59, y: 37 },
};

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

const ACCENT = "#2e7d32";

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-black/20 bg-white px-2.5 py-1.5 font-mono text-[11px] text-[color:var(--ink)] cursor-pointer transition-[color,border-color,background-color,transform] duration-150 hover:border-[color:var(--ink)] active:translate-y-px focus-visible:outline-none focus-visible:border-[#2e7d32] focus-visible:shadow-[0_0_0_2px_rgba(46,125,50,0.16)]";

const NODE_BASE =
  "absolute z-[2] flex flex-col gap-[2px] rounded-lg border border-black/10 bg-white px-2.5 py-1.5 transition-[border-color,background-color,transform] duration-300 will-change-transform";
const NODE_ACTOR = "w-[22%] min-w-0";
const NODE_ACTIVE = "border-[#2e7d32] bg-[rgba(46,125,50,0.16)]";

const NODE_LEFT = "-translate-y-1/2";

const SLAB =
  "absolute z-[1] flex flex-col gap-1.5 rounded-[0.6rem] border border-black/10 bg-white px-2.5 py-2 transition-[border-color,background-color] duration-300";
const SLAB_ACTIVE = "border-[#2e7d32] bg-[rgba(46,125,50,0.04)]";

const TIMELINE_BTN =
  "flex w-full cursor-pointer flex-col items-start gap-1 border-0 border-t-2 border-black/10 bg-transparent px-2 pb-2.5 pt-2 text-left font-mono transition-colors duration-200 hover:text-[color:var(--ink)]";

export function CoordinationDiagram() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);

  const phase = FRAMES[frameIndex].name;
  const currentFrame = FRAMES[frameIndex];

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

  return (
    <figure
      className="not-prose my-9 rounded-3xl border border-black/10 bg-white px-6 pb-5 pt-6 font-mono text-[color:var(--ink)] shadow-[0_22px_60px_-45px_rgba(20,20,19,0.3)]"
      aria-label="Distributed lock coordination animation"
    >
      {/* header */}
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-black/10 pb-4 max-[640px]:flex-col">
        <div>
          <span
            className="mb-1.5 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: ACCENT }}
          >
            {currentFrame.title}
          </span>
          <p className="m-0 min-h-[3.1em] max-w-[56ch] font-sans text-[13.5px] leading-[1.55] text-[color:var(--ink)]">
            {currentFrame.caption}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            className={BTN}
            onClick={togglePlay}
            aria-label={playing ? "pause" : "play"}
          >
            {playing ? <Pause size={12} strokeWidth={2} /> : <Play size={12} strokeWidth={2} />}
            {playing ? "pause" : "play"}
          </button>
          <button type="button" className={BTN} onClick={restart} aria-label="restart">
            <RotateCcw size={12} strokeWidth={2} /> restart
          </button>
        </div>
      </header>

      {/* stage */}
      <div className="relative w-full overflow-hidden rounded-[0.85rem] border border-black/10 bg-black/[0.015] aspect-[16/7] max-[640px]:aspect-[4/5]">
        {/* actor cards (left-anchored) */}
        <ActorCard x={CARDS.A.x} y={CARDS.A.y} active={phase === "compute" || phase === "write"}>
          <span className="text-[10.5px] font-bold uppercase leading-[1.1] tracking-[0.16em] text-[color:var(--ink)]">
            container A
          </span>
          <span className="text-[10px] text-[color:var(--ink-muted)]">{statusFor("A", phase)}</span>
        </ActorCard>
        <ActorCard x={CARDS.B.x} y={CARDS.B.y} active={phase === "wake"}>
          <span className="text-[10.5px] font-bold uppercase leading-[1.1] tracking-[0.16em] text-[color:var(--ink)]">
            container B
          </span>
          <span className="text-[10px] text-[color:var(--ink-muted)]">{statusFor("B", phase)}</span>
        </ActorCard>
        <ActorCard x={CARDS.C.x} y={CARDS.C.y} active={phase === "wake"}>
          <span className="text-[10.5px] font-bold uppercase leading-[1.1] tracking-[0.16em] text-[color:var(--ink)]">
            container C
          </span>
          <span className="text-[10px] text-[color:var(--ink-muted)]">{statusFor("C", phase)}</span>
        </ActorCard>

        {/* L2 Dict slab */}
        <Slab
          x={38}
          y={10}
          width={24}
          height={80}
          title="L2 · Modal Dict"
          active={
            phase === "race" || phase === "compute" || phase === "write" || phase === "notify"
          }
        >
          <SlabRow
            label="lock(K)"
            active={phase === "race" || phase === "register" || phase === "compute"}
          >
            {phase === "race" || phase === "register" || phase === "compute"
              ? "holder=A, waiters=[B,C]"
              : "—"}
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
          x={70}
          y={15}
          width={24}
          height={72}
          title="Modal Queue"
          active={phase === "register" || phase === "notify" || phase === "wake"}
        >
          <SlabRow
            label="partition B"
            active={
              phase === "register" || phase === "compute" || phase === "write" || phase === "notify"
            }
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
            active={
              phase === "register" || phase === "compute" || phase === "write" || phase === "notify"
            }
            highlight={phase === "notify"}
          >
            {phase === "register" || phase === "compute" || phase === "write"
              ? "blocking get()"
              : phase === "notify"
                ? "← put(notify)"
                : "—"}
          </SlabRow>
        </Slab>

        {/* tokens */}
        {Object.entries(TOKEN_TRACKS).map(([id, tracks]) => {
          const pt = tracks[phase];
          const isNotify = id.startsWith("notify");
          return (
            <Token
              key={id}
              x={pt.x}
              y={pt.y}
              visible={Boolean(pt.visible)}
              pulse={Boolean(pt.pulse)}
              variant={isNotify ? "notify" : id === "A" ? "a" : "bc"}
            >
              {isNotify ? "" : id}
            </Token>
          );
        })}
      </div>

      {/* timeline */}
      <ol className="m-0 mt-[1.1rem] flex list-none gap-1 p-0">
        {FRAMES.map((f, i) => {
          const isActive = i === frameIndex;
          const isDone = i < frameIndex;
          return (
            <li key={f.name} className="min-w-0 flex-shrink list-none" style={{ flex: f.duration }}>
              <button
                type="button"
                className={`${TIMELINE_BTN} ${
                  isActive
                    ? "!border-t-[#2e7d32] text-[color:var(--ink)]"
                    : isDone
                      ? "border-t-black/20 text-[color:var(--ink-muted)]"
                      : "text-[color:var(--ink-muted)]"
                }`}
                onClick={() => {
                  setFrameIndex(i);
                  setPlaying(false);
                }}
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.22em]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10.5px]">
                  {f.short}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

function ActorCard({
  x,
  y,
  active,
  children,
}: {
  x: number;
  y: number;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${NODE_BASE} ${NODE_ACTOR} ${NODE_LEFT} ${active ? NODE_ACTIVE : ""}`}
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
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${SLAB} ${active ? SLAB_ACTIVE : ""}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
        {title}
      </span>
      <div className="grid flex-1 gap-1.5">{children}</div>
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
  const baseRow =
    "grid grid-cols-1 items-start gap-[3px] rounded-[0.4rem] border border-dashed border-black/10 bg-black/[0.02] px-1.5 py-1.5 text-[11px] transition-[border-color,background-color] duration-300";
  const activeRow = "border-black/20 bg-white";
  const highlightRow = "!border-[#2e7d32] !bg-[rgba(46,125,50,0.16)]";
  return (
    <div className={`${baseRow} ${active ? activeRow : ""} ${highlight ? highlightRow : ""}`}>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[color:var(--ink-muted)]">
        {label}
      </span>
      <span className="text-[11px] leading-[1.35] text-[color:var(--ink)]">{children}</span>
    </div>
  );
}

function Token({
  x,
  y,
  visible,
  pulse,
  variant,
  children,
}: {
  x: number;
  y: number;
  visible: boolean;
  pulse: boolean;
  variant: "a" | "bc" | "notify";
  children: React.ReactNode;
}) {
  const sizeClass = variant === "notify" ? "h-3.5 w-3.5" : "h-[1.45rem] w-[1.45rem]";
  const bgClass =
    variant === "a" ? "bg-[#2e7d32]" : variant === "bc" ? "bg-[#4a5568]" : "bg-[#2e7d32]";
  const fanout = variant === "notify" && visible ? "animate-[coord-anim-fanout_0.7s_ease-out]" : "";
  const pulseClass = pulse ? "animate-[coord-anim-pulse_1.4s_ease-in-out_infinite]" : "";
  return (
    <span
      className={`pointer-events-none absolute z-[3] inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(20,20,19,0.35)] transition-[top,left,opacity,transform,background-color] duration-[700ms] will-change-[top,left] ease-[cubic-bezier(0.4,0,0.2,1)] ${sizeClass} ${bgClass} ${pulseClass} ${fanout} ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-hidden
    >
      {children}
    </span>
  );
}
