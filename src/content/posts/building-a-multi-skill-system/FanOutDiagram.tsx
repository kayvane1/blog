import { FileText, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "spawn" | "wrap" | "read" | "work" | "return" | "review";

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
    duration: 1500,
    title: "playbook step",
    short: "step",
    caption:
      "Bug-fix step 2: binary-search the cause. The playbook calls for how + why in parallel and a code-writing delegate.",
  },
  {
    name: "spawn",
    duration: 1700,
    title: "Task() calls go out",
    short: "spawn",
    caption:
      'Parent emits three Task calls. Each one names subagent_type: "poteto-agent" with a different model argument.',
  },
  {
    name: "wrap",
    duration: 1500,
    title: "wrapper enters",
    short: "wrap",
    caption:
      "Every child enters the same six-line poteto-agent wrapper. Subagent type and model are independent arguments on the same Task.",
  },
  {
    name: "read",
    duration: 2000,
    title: "read SKILL.md",
    short: "read",
    caption:
      "Each child loads poteto-mode/SKILL.md and the inline principles index before it touches any work.",
  },
  {
    name: "work",
    duration: 2300,
    title: "compute on different models",
    short: "work",
    caption:
      "Children run on different models. how on opus-thinking, why on opus-thinking, code delegate on composer-2.5-fast. Same operating manual underneath.",
  },
  {
    name: "return",
    duration: 1700,
    title: "reduced findings",
    short: "return",
    caption:
      "Children return summaries, not megabyte transcripts. Bulk stays out of the main thread, per guard-the-context-window.",
  },
  {
    name: "review",
    duration: 2200,
    title: "parent reviews",
    short: "review",
    caption:
      "Parent reviews each diff and writes its own summary. You own every subagent's work, never pass through what it said.",
  },
];

type Pt = { x: number; y: number; visible?: boolean };

const PARENT_POS = { x: 50, y: 14 };

const CHILDREN = [
  { id: "A", task: "how", model: "claude-opus-4-7-thinking", short: "opus-thinking", x: 18 },
  { id: "B", task: "why", model: "claude-opus-4-7-thinking", short: "opus-thinking", x: 50 },
  { id: "C", task: "code delegate", model: "composer-2.5-fast", short: "composer-fast", x: 82 },
];

const SPAWN_TARGET_Y = 44;
const RETURN_START_Y = 78;

const SPAWN_TRACKS: Record<string, Record<Phase, Pt>> = CHILDREN.reduce(
  (acc, c) => {
    acc[c.id] = {
      idle: { x: PARENT_POS.x, y: PARENT_POS.y + 4, visible: false },
      spawn: { x: c.x, y: SPAWN_TARGET_Y, visible: true },
      wrap: { x: c.x, y: SPAWN_TARGET_Y, visible: false },
      read: { x: c.x, y: SPAWN_TARGET_Y, visible: false },
      work: { x: c.x, y: SPAWN_TARGET_Y, visible: false },
      return: { x: c.x, y: SPAWN_TARGET_Y, visible: false },
      review: { x: c.x, y: SPAWN_TARGET_Y, visible: false },
    };
    return acc;
  },
  {} as Record<string, Record<Phase, Pt>>,
);

const RETURN_TRACKS: Record<string, Record<Phase, Pt>> = CHILDREN.reduce(
  (acc, c) => {
    acc[c.id] = {
      idle: { x: c.x, y: RETURN_START_Y, visible: false },
      spawn: { x: c.x, y: RETURN_START_Y, visible: false },
      wrap: { x: c.x, y: RETURN_START_Y, visible: false },
      read: { x: c.x, y: RETURN_START_Y, visible: false },
      work: { x: c.x, y: RETURN_START_Y, visible: false },
      return: { x: PARENT_POS.x, y: PARENT_POS.y + 4, visible: true },
      review: { x: PARENT_POS.x, y: PARENT_POS.y + 4, visible: false },
    };
    return acc;
  },
  {} as Record<string, Record<Phase, Pt>>,
);

const ACCENT = "#2e7d32";

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-black/20 bg-white px-2.5 py-1.5 font-mono text-[11px] text-[color:var(--ink)] cursor-pointer transition-[color,border-color,background-color,transform] duration-150 hover:border-[color:var(--ink)] active:translate-y-px focus-visible:outline-none focus-visible:border-[#2e7d32] focus-visible:shadow-[0_0_0_2px_rgba(46,125,50,0.16)]";

const TIMELINE_BTN =
  "flex w-full cursor-pointer flex-col items-start gap-1 border-0 border-t-2 border-black/10 bg-transparent px-2 pb-2.5 pt-2 text-left font-mono transition-colors duration-200 hover:text-[color:var(--ink)]";

export function FanOutDiagram() {
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

  const parentActive = phase === "idle" || phase === "spawn" || phase === "review";
  const wrapActive = phase === "wrap" || phase === "read" || phase === "work";
  const readActive = phase === "read";
  const workActive = phase === "work";

  return (
    <figure
      className="not-prose my-9 rounded-3xl border border-black/10 bg-white px-6 pb-5 pt-6 font-mono text-[color:var(--ink)] shadow-[0_22px_60px_-45px_rgba(20,20,19,0.3)]"
      aria-label="Fan-out subagent diagram"
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
          <p className="m-0 min-h-[3.4em] max-w-[58ch] font-sans text-[13.5px] leading-[1.55] text-[color:var(--ink)]">
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
      <div
        className="relative w-full rounded-[0.85rem] border border-black/10 bg-black/[0.015]"
        style={{ height: 420 }}
      >
        {/* parent */}
        <div
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white px-3.5 py-2 text-center transition-[border-color,background-color] duration-300 ${parentActive ? "border-[#2e7d32] bg-[rgba(46,125,50,0.14)]" : "border-black/15"}`}
          style={{ left: `${PARENT_POS.x}%`, top: `${PARENT_POS.y}%` }}
        >
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-muted)]">
            parent
          </div>
          <div className="font-mono text-[11.5px] text-[color:var(--ink)]">/poteto-mode</div>
          <div className="font-mono text-[9.5px] text-[color:var(--ink-muted)]">
            on opus-thinking
          </div>
        </div>

        {/* children */}
        {CHILDREN.map((c) => (
          <div
            key={c.id}
            className="absolute flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ left: `${c.x}%`, top: "40%" }}
          >
            <div
              className={`w-[14ch] rounded-md border bg-white px-1.5 py-1 text-center transition-[border-color,background-color] duration-300 ${wrapActive ? "border-[#2e7d32] bg-[rgba(46,125,50,0.10)]" : "border-black/20"}`}
            >
              <div className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[color:var(--ink-muted)]">
                subagent_type
              </div>
              <div className="font-mono text-[10px] font-semibold text-[color:var(--ink)]">
                poteto-agent
              </div>
            </div>
            <div
              className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em] transition-[color,transform] duration-300 ${readActive ? "scale-110 text-[#2e7d32]" : "text-[color:var(--ink-muted)]"}`}
              style={{ animation: readActive ? "fanout-read 1.2s ease-in-out infinite" : "none" }}
            >
              <FileText size={9} strokeWidth={2.2} />
              <span>SKILL.md</span>
            </div>
            <div
              className={`w-[14ch] rounded-md border bg-white px-1.5 py-1 text-center transition-[border-color,background-color] duration-300 ${workActive ? "border-[#2e7d32] bg-[rgba(46,125,50,0.10)]" : "border-black/20"}`}
            >
              <div className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[color:var(--ink-muted)]">
                model
              </div>
              <div className="font-mono text-[10px] font-semibold text-[color:var(--ink)]">
                {c.short}
              </div>
            </div>
            <div className="text-center font-mono text-[9px] text-[color:var(--ink-muted)]">
              {c.task}
            </div>
          </div>
        ))}

        {/* spawn tokens */}
        {Object.entries(SPAWN_TRACKS).map(([id, track]) => {
          const pt = track[phase];
          return (
            <span
              key={`spawn-${id}`}
              className={`pointer-events-none absolute z-[3] inline-flex h-5 min-w-[2.4rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#2e7d32] px-1.5 font-mono text-[9px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(46,125,50,0.5)] transition-[top,left,opacity] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${pt.visible ? "opacity-100" : "opacity-0"}`}
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              aria-hidden
            >
              Task({id})
            </span>
          );
        })}

        {/* return tokens */}
        {Object.entries(RETURN_TRACKS).map(([id, track]) => {
          const pt = track[phase];
          return (
            <span
              key={`return-${id}`}
              className={`pointer-events-none absolute z-[3] inline-flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#4a5568] font-mono text-[8px] font-semibold text-white transition-[top,left,opacity] duration-[700ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${pt.visible ? "opacity-100" : "opacity-0"}`}
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              aria-hidden
            >
              {id}
            </span>
          );
        })}

        {/* connector lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {CHILDREN.map((c) => (
            <line
              key={`line-${c.id}`}
              x1={`${PARENT_POS.x}%`}
              y1={`${PARENT_POS.y + 6}%`}
              x2={`${c.x}%`}
              y2={`${SPAWN_TARGET_Y - 4}%`}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}
        </svg>
      </div>

      {/* timeline */}
      <div className="mt-[1.1rem] flex gap-1" role="list" aria-label="phase timeline">
        {FRAMES.map((f, i) => {
          const isActive = i === frameIndex;
          const isDone = i < frameIndex;
          return (
            <div
              key={f.name}
              className="min-w-0 flex-shrink"
              style={{ flex: f.duration }}
              role="listitem"
            >
              <button
                type="button"
                className={`${TIMELINE_BTN} ${
                  isActive
                    ? "border-t-[#2e7d32]! text-[color:var(--ink)]"
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
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fanout-read {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </figure>
  );
}
