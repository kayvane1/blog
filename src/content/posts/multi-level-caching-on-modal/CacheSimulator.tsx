import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ContainerId = "A" | "B";
type Layer = "L1" | "L2" | "L3" | "compute";

type LogEntry = {
  id: number;
  container: ContainerId | "system";
  text: string;
  tone: "hit" | "miss" | "info" | "lock" | "compute";
};

type ContainerState = {
  l1: Map<string, string>;
  status: string;
  highlight: Layer | null;
};

type SharedState = {
  l2: Map<string, string>;
  l3: Map<string, string>;
  lock: { key: string; holder: ContainerId; waiters: ContainerId[] } | null;
};

type Stats = {
  l1Hits: number;
  l2Hits: number;
  l3Hits: number;
  computes: number;
  collapsedHerds: number;
};

const SEED_KEYS = ["user:42", "report:q3", "embed:doc-7"];
const SEED_L3: [string, string][] = [["report:q3", "id_report_q3"]];

const initialContainer = (): ContainerState => ({
  l1: new Map(),
  status: "idle",
  highlight: null,
});

const initialShared = (): SharedState => ({
  l2: new Map(),
  l3: new Map(SEED_L3),
  lock: null,
});

const initialStats = (): Stats => ({
  l1Hits: 0,
  l2Hits: 0,
  l3Hits: 0,
  computes: 0,
  collapsedHerds: 0,
});

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isBelowL1 = (layer: Layer | null) => layer === "L2" || layer === "L3" || layer === "compute";
const isBelowL2 = (layer: Layer | null) => layer === "L3" || layer === "compute";

// Shared Tailwind class strings — kept near the component instead of in a
// global stylesheet, so deleting this bundle deletes its styling too.
const ACCENT = "#2e7d32";
const ACCENT_SOFT = "rgba(46, 125, 50, 0.12)";

const CHIP =
  "rounded-full border border-black/20 bg-white px-2.5 py-[3px] font-mono text-[11px] text-[color:var(--ink)] cursor-pointer transition-[color,border-color,background-color,transform] duration-150 hover:not-disabled:border-[color:var(--ink)] active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45";
const CHIP_ACTIVE = "bg-[color:var(--ink)]! text-white! border-[color:var(--ink)]!";

const BTN_BASE =
  "inline-flex items-center gap-1.5 rounded-lg border border-black/20 bg-white px-3 py-1.5 font-mono text-[11px] text-[color:var(--ink)] cursor-pointer transition-[color,border-color,background-color,transform] duration-150 hover:not-disabled:border-[color:var(--ink)] active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:border-[#2e7d32] focus-visible:shadow-[0_0_0_2px_rgba(46,125,50,0.16)]";
const BTN_ACCENT =
  "bg-[color:var(--ink)]! text-white! border-[color:var(--ink)]! hover:not-disabled:bg-black!";
const BTN_GHOST =
  "border-dashed text-[color:var(--ink-muted)] hover:not-disabled:text-[color:var(--ink)]";

const KBD =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-[0.3rem] border border-black/20 bg-black/[0.04] px-1 font-mono text-[10px]";

const NODE_BASE =
  "relative rounded-[0.85rem] border border-black/10 bg-white p-[15px] transition-[border-color,box-shadow,transform] duration-200 will-change-transform";
const NODE_ACTIVE = "border-[#2e7d32] shadow-[0_0_0_3px_rgba(46,125,50,0.12)] -translate-y-px";

const SHARED_BASE =
  "rounded-[0.85rem] border border-[#0e0f11] bg-[#0e0f11] text-[#f3f3f0] px-4 py-3.5 transition-[border-color,box-shadow,transform] duration-200 will-change-transform";
const SHARED_ACTIVE = "border-[#2e7d32] shadow-[0_0_0_3px_rgba(46,125,50,0.12)] -translate-y-px";

const STAT_CELL =
  "flex flex-col gap-[3px] bg-white px-3.5 py-2.5 border-r border-black/10 transition-colors duration-150 hover:bg-black/[0.02] last:border-r-0 max-[640px]:[&:nth-child(2n)]:border-r-0 max-[640px]:border-b max-[640px]:border-black/10";

const LANE_RAIL_BASE =
  "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-repeat-y bg-[length:1px_6px] opacity-70 transition-[opacity,background-image] duration-200";

const LOG_TONE: Record<LogEntry["tone"], string> = {
  hit: "text-[#b6f0a5]",
  miss: "text-[#ffb454]",
  lock: "text-[#9bd6ff]",
  compute: "text-[#d9b3ff]",
  info: "text-[#f3f3f0]",
};

const LEGEND_TONE = {
  hit: "text-[#2e7d32]",
  miss: "text-[#c87a2f]",
  lock: "text-[#3a6ea5]",
  compute: "text-[#6b4ea0]",
} as const;

const ROW_RESET = "list-none m-0 p-0";

export function CacheSimulator() {
  const [containers, setContainers] = useState<Record<ContainerId, ContainerState>>({
    A: initialContainer(),
    B: initialContainer(),
  });
  const [shared, setShared] = useState<SharedState>(initialShared());
  const [stats, setStats] = useState<Stats>(initialStats());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [activeKey, setActiveKey] = useState<string>(SEED_KEYS[0]);
  const [busy, setBusy] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  const sharedRef = useRef(shared);
  const containersRef = useRef(containers);
  const logIdRef = useRef(0);
  useEffect(() => {
    sharedRef.current = shared;
  }, [shared]);
  useEffect(() => {
    containersRef.current = containers;
  }, [containers]);

  const tick = useCallback(async (ms: number) => sleep(ms / speed), [speed]);

  const pushLog = useCallback((entry: Omit<LogEntry, "id">) => {
    logIdRef.current += 1;
    setLog((prev) => [{ id: logIdRef.current, ...entry }, ...prev].slice(0, 50));
  }, []);

  const updateContainer = useCallback((id: ContainerId, patch: Partial<ContainerState>) => {
    setContainers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const reset = useCallback(() => {
    setContainers({ A: initialContainer(), B: initialContainer() });
    setShared(initialShared());
    setStats(initialStats());
    setLog([]);
  }, []);

  const computeValue = useCallback(
    (key: string) => `id_${key.replace(/[:/]/g, "_")}_${Date.now() % 10000}`,
    [],
  );

  const fetchKey = useCallback(
    async (id: ContainerId, key: string, isThunderingHerd = false) => {
      const peer: ContainerId = id === "A" ? "B" : "A";

      updateContainer(id, { status: `get ${key}`, highlight: "L1" });
      pushLog({ container: id, text: `get ${key}`, tone: "info" });
      await tick(420);

      if (containersRef.current[id].l1.has(key)) {
        const value = containersRef.current[id].l1.get(key)!;
        setStats((s) => ({ ...s, l1Hits: s.l1Hits + 1 }));
        pushLog({ container: id, text: `L1 hit → ${value}`, tone: "hit" });
        updateContainer(id, { status: `L1 hit → ${value}` });
        await tick(480);
        updateContainer(id, { status: "idle", highlight: null });
        return value;
      }

      pushLog({ container: id, text: `L1 miss`, tone: "miss" });
      updateContainer(id, { status: "L1 miss → L2", highlight: "L2" });
      await tick(620);

      if (sharedRef.current.l2.has(key)) {
        const value = sharedRef.current.l2.get(key)!;
        setStats((s) => ({ ...s, l2Hits: s.l2Hits + 1 }));
        pushLog({ container: id, text: `L2 hit → ${value}`, tone: "hit" });
        updateContainer(id, { status: `L2 hit → ${value}` });
        const nextL1 = new Map(containersRef.current[id].l1).set(key, value);
        updateContainer(id, { l1: nextL1 });
        await tick(420);
        updateContainer(id, { status: "idle", highlight: null });
        return value;
      }

      pushLog({ container: id, text: `L2 miss`, tone: "miss" });

      const existingLock = sharedRef.current.lock;
      if (existingLock && existingLock.key === key) {
        setShared((prev) => {
          const next = { ...prev };
          if (next.lock && next.lock.key === key && !next.lock.waiters.includes(id)) {
            next.lock = { ...next.lock, waiters: [...next.lock.waiters, id] };
          }
          return next;
        });
        if (isThunderingHerd) {
          setStats((s) => ({ ...s, collapsedHerds: s.collapsedHerds + 1 }));
        }
        pushLog({ container: id, text: `registered as waiter on ${key}`, tone: "lock" });
        updateContainer(id, { status: `waiting on ${peer}` });
        const start = performance.now();
        while (sharedRef.current.lock && sharedRef.current.lock.key === key) {
          if (performance.now() - start > 8000) break;
          await tick(120);
        }
        const v = sharedRef.current.l2.get(key);
        if (v !== undefined) {
          pushLog({ container: id, text: `notified → ${v}`, tone: "hit" });
          const nextL1 = new Map(containersRef.current[id].l1).set(key, v);
          updateContainer(id, { l1: nextL1, status: `awake → ${v}`, highlight: "L1" });
          await tick(380);
          updateContainer(id, { status: "idle", highlight: null });
          return v;
        }
        updateContainer(id, { status: "idle", highlight: null });
        return undefined;
      }

      setShared((prev) => ({ ...prev, lock: { key, holder: id, waiters: [] } }));
      pushLog({ container: id, text: `acquired lock for ${key}`, tone: "lock" });

      updateContainer(id, { status: "L3 lookup", highlight: "L3" });
      await tick(620);

      let value: string;
      if (sharedRef.current.l3.has(key)) {
        value = sharedRef.current.l3.get(key)!;
        setStats((s) => ({ ...s, l3Hits: s.l3Hits + 1 }));
        pushLog({ container: id, text: `L3 hit → ${value}`, tone: "hit" });
      } else {
        pushLog({ container: id, text: `L3 miss → compute`, tone: "miss" });
        updateContainer(id, { status: "computing", highlight: "compute" });
        await tick(1100);
        value = computeValue(key);
        setShared((prev) => ({ ...prev, l3: new Map(prev.l3).set(key, value) }));
        setStats((s) => ({ ...s, computes: s.computes + 1 }));
        pushLog({ container: id, text: `minted in DB → ${value}`, tone: "compute" });
      }

      const nextL1 = new Map(containersRef.current[id].l1).set(key, value);
      updateContainer(id, { l1: nextL1, status: `propagated → ${value}`, highlight: "L2" });
      setShared((prev) => ({ ...prev, l2: new Map(prev.l2).set(key, value) }));
      await tick(480);

      const waiters = sharedRef.current.lock?.waiters ?? [];
      setShared((prev) => ({ ...prev, lock: null }));
      if (waiters.length > 0) {
        pushLog({
          container: id,
          text: `notified ${waiters.length} waiter${waiters.length === 1 ? "" : "s"}`,
          tone: "lock",
        });
      }

      updateContainer(id, { status: "idle", highlight: null });
      return value;
    },
    [computeValue, pushLog, tick, updateContainer],
  );

  const runSingle = useCallback(
    async (id: ContainerId) => {
      if (busy) return;
      setBusy(true);
      try {
        await fetchKey(id, activeKey);
      } finally {
        setBusy(false);
      }
    },
    [activeKey, busy, fetchKey],
  );

  const runThunderingHerd = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.all([
        fetchKey("A", activeKey, true),
        (async () => {
          await sleep(80);
          await fetchKey("B", activeKey, true);
        })(),
      ]);
    } finally {
      setBusy(false);
    }
  }, [activeKey, busy, fetchKey]);

  const invalidate = useCallback(() => {
    setShared((prev) => {
      const l2 = new Map(prev.l2);
      l2.delete(activeKey);
      return { ...prev, l2 };
    });
    setContainers((prev) => {
      const next = { ...prev };
      (Object.keys(next) as ContainerId[]).forEach((id) => {
        const l1 = new Map(next[id].l1);
        l1.delete(activeKey);
        next[id] = { ...next[id], l1 };
      });
      return next;
    });
    pushLog({ container: "system", text: `invalidated ${activeKey}`, tone: "info" });
  }, [activeKey, pushLog]);

  const evictL1 = useCallback(
    (id: ContainerId) => {
      setContainers((prev) => ({
        ...prev,
        [id]: { ...prev[id], l1: new Map() },
      }));
      pushLog({ container: id, text: `restart → L1 evicted`, tone: "info" });
    },
    [pushLog],
  );

  const keyChips = useMemo(() => SEED_KEYS, []);

  const aBelowL1 = isBelowL1(containers.A.highlight);
  const bBelowL1 = isBelowL1(containers.B.highlight);
  const aBelowL2 = isBelowL2(containers.A.highlight);
  const bBelowL2 = isBelowL2(containers.B.highlight);
  const l2Active = containers.A.highlight === "L2" || containers.B.highlight === "L2";
  const l3Active = containers.A.highlight === "L3" || containers.B.highlight === "L3";
  const computeActive =
    containers.A.highlight === "compute" || containers.B.highlight === "compute";

  return (
    <section
      className="not-prose relative my-12 rounded-3xl border border-black/10 bg-white p-7 pb-6 font-mono text-[12.5px] text-[color:var(--ink)] shadow-[0_22px_60px_-45px_rgba(20,20,19,0.4)]"
      aria-label="Multi-level cache simulator"
    >
      {/* header */}
      <header className="mb-6 flex items-start justify-between gap-6 border-b border-black/10 pb-5 max-[720px]:flex-col">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-muted)]">
            live simulator
          </span>
          <h3 className="m-0 font-sans text-[19px] font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
            Cross-container cache flow
          </h3>
          <p className="m-0 text-xs text-[color:var(--ink-muted)]">
            Two containers · one Modal Dict · one database · one distributed lock.
          </p>
        </div>
        <div className="flex flex-wrap gap-3.5 text-[10.5px] tracking-[0.06em] text-[color:var(--ink-muted)]">
          <LegendDot label="hit" tone="hit" />
          <LegendDot label="miss" tone="miss" />
          <LegendDot label="lock" tone="lock" />
          <LegendDot label="compute" tone="compute" />
        </div>
      </header>

      {/* controls */}
      <div className="mb-6 flex flex-wrap items-center gap-5 border-b border-black/10 pb-5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
            key
          </span>
          <div className="inline-flex flex-wrap gap-1.5">
            {keyChips.map((k) => (
              <button
                key={k}
                type="button"
                className={`${CHIP} ${activeKey === k ? CHIP_ACTIVE : ""}`}
                onClick={() => setActiveKey(k)}
                disabled={busy}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
            speed
          </span>
          <div className="inline-flex flex-wrap gap-1.5">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                className={`${CHIP} ${speed === s ? CHIP_ACTIVE : ""}`}
                onClick={() => setSpeed(s)}
                disabled={busy}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className={BTN_BASE} onClick={() => runSingle("A")} disabled={busy}>
            <span className={KBD}>A</span>
            get
          </button>
          <button type="button" className={BTN_BASE} onClick={() => runSingle("B")} disabled={busy}>
            <span className={KBD}>B</span>
            get
          </button>
          <button
            type="button"
            className={`${BTN_BASE} ${BTN_ACCENT}`}
            onClick={runThunderingHerd}
            disabled={busy}
          >
            herd · A+B
          </button>
          <button
            type="button"
            className={`${BTN_BASE} ${BTN_GHOST}`}
            onClick={invalidate}
            disabled={busy}
          >
            invalidate
          </button>
          <button
            type="button"
            className={`${BTN_BASE} ${BTN_GHOST}`}
            onClick={reset}
            disabled={busy}
          >
            reset
          </button>
        </div>
      </div>

      {/* stat bar */}
      <div className="mb-5 grid grid-cols-5 overflow-hidden rounded-[0.85rem] border border-black/10 bg-white max-[640px]:grid-cols-2">
        <Stat label="L1" sub="hits" value={stats.l1Hits} />
        <Stat label="L2" sub="hits" value={stats.l2Hits} />
        <Stat label="L3" sub="hits" value={stats.l3Hits} />
        <Stat label="compute" sub="runs" value={stats.computes} />
        <Stat label="herd" sub="collapsed" value={stats.collapsedHerds} />
      </div>

      {/* board */}
      <div className="grid gap-0">
        <div className="grid grid-cols-2 gap-3.5 max-[520px]:grid-cols-1">
          {(["A", "B"] as ContainerId[]).map((id) => {
            const c = containers[id];
            return (
              <article
                key={id}
                className={`${NODE_BASE} ${c.highlight ? NODE_ACTIVE : ""}`}
                aria-label={`container ${id}`}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="inline-flex items-center font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink)]">
                    <span
                      className={`mr-1.5 inline-flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-full border border-black/20 bg-black/[0.04] text-[10px] tracking-normal ${
                        c.highlight ? "border-[#2e7d32] bg-[#2e7d32]! text-white" : ""
                      }`}
                    >
                      {id}
                    </span>
                    container {id}
                  </span>
                  <button
                    type="button"
                    className="cursor-pointer rounded-full border border-black/20 bg-transparent px-2 py-[3px] font-mono text-[9.5px] tracking-[0.05em] text-[color:var(--ink-muted)] transition-colors hover:not-disabled:border-[color:var(--ink)] hover:not-disabled:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={() => evictL1(id)}
                    disabled={busy}
                  >
                    restart
                  </button>
                </div>
                <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[color:var(--ink-muted)]">
                  L1 · LRU · in-process
                </div>
                {c.l1.size === 0 ? (
                  <div className="py-1.5 text-[11px] text-[color:var(--ink-muted)] opacity-60">
                    empty cache
                  </div>
                ) : (
                  <ul className={`${ROW_RESET} grid gap-1`}>
                    {Array.from(c.l1.entries()).map(([k, v]) => (
                      <li
                        key={k}
                        className="flex items-baseline justify-between gap-3 border-b border-dashed border-black/10 py-1.5 text-[12px] last:border-b-0"
                      >
                        <code className="bg-transparent! p-0! font-mono text-[12px] text-[color:var(--ink)]!">
                          {k}
                        </code>
                        <span className="text-[11.5px] text-[#2e7d32]">{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 min-h-[1.1rem] border-t border-dashed border-black/10 pt-2 text-[11px] text-[color:var(--ink-muted)]">
                  {c.status}
                </div>
              </article>
            );
          })}
        </div>

        <Connectors aActive={aBelowL1} bActive={bBelowL1} label="on L1 miss" />

        <SharedLayer
          title="L2 · Modal Dict · shared"
          active={l2Active}
          entries={shared.l2}
          footer={
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#f3f3f0]">
              {shared.lock ? (
                <>
                  <span
                    className="inline-block h-2 w-2 rounded-full animate-[cache-sim-pulse_1.4s_ease-in-out_infinite]"
                    style={{ background: ACCENT, boxShadow: `0 0 0 3px ${ACCENT_SOFT}` }}
                  />
                  <span>
                    lock{" "}
                    <code className="rounded-[0.25rem] bg-white/10! px-1.5 py-[2px] text-[10.5px] text-[#f3f3f0]!">
                      {shared.lock.key}
                    </code>{" "}
                    · held by container {shared.lock.holder}
                    {shared.lock.waiters.length > 0 ? (
                      <> · {shared.lock.waiters.length} waiting</>
                    ) : null}
                  </span>
                </>
              ) : (
                <span className="opacity-45">no lock held · Modal Queue idle</span>
              )}
            </div>
          }
        />

        <Connectors
          aActive={aBelowL2}
          bActive={bBelowL2}
          single
          label={computeActive ? "compute" : "on L2 miss"}
        />

        <SharedLayer
          title="L3 · Database · source of truth"
          active={l3Active || computeActive}
          entries={shared.l3}
        />
      </div>

      {/* event log */}
      <div
        className="mt-5 max-h-[260px] overflow-y-auto rounded-[0.85rem] border border-[#0e0f11] bg-[#0e0f11] px-4 py-3.5 text-[11.5px] leading-[1.6] text-[#f3f3f0]"
        aria-live="polite"
      >
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-dashed border-white/10 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
          <span>event stream</span>
          <span className="text-[9.5px] opacity-60">latest first</span>
        </div>
        {log.length === 0 ? (
          <p className="m-0 text-[11px] italic opacity-40">streaming output appears here</p>
        ) : (
          <ul className={`${ROW_RESET} grid gap-[5px]`}>
            {log.map((entry) => (
              <li
                key={entry.id}
                className={`grid grid-cols-[1.85rem_1fr] items-baseline gap-2.5 ${LOG_TONE[entry.tone]}`}
              >
                <span className="rounded-[0.25rem] border border-white/10 px-1 py-[2px] text-center font-mono text-[9px] uppercase leading-[1.2] tracking-[0.16em] text-white/60">
                  {entry.container === "system" ? "sys" : entry.container}
                </span>
                <span>{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Connectors({
  aActive,
  bActive,
  single = false,
  label,
}: {
  aActive: boolean;
  bActive: boolean;
  single?: boolean;
  label?: string;
}) {
  return (
    <div
      className={`relative grid h-14 gap-3.5 ${single ? "grid-cols-1 justify-items-center" : "grid-cols-2"}`}
      aria-hidden
    >
      <Lane active={aActive} letter="A" />
      {!single ? <Lane active={bActive} letter="B" /> : null}
      {label ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-black/10 bg-white px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)] max-[520px]:hidden">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function Lane({ active, letter }: { active: boolean; letter: string }) {
  const accent = "#2e7d32";
  const rail = active
    ? `linear-gradient(to bottom, ${accent} 0%, ${accent} 50%, transparent 50%, transparent 100%)`
    : "linear-gradient(to bottom, rgba(20,20,19,0.2) 0%, rgba(20,20,19,0.2) 50%, transparent 50%, transparent 100%)";
  return (
    <div className="relative flex h-full w-full items-stretch justify-center">
      <span
        className={`${LANE_RAIL_BASE} ${active ? "opacity-100" : ""}`}
        style={{ backgroundImage: rail }}
      />
      <span
        className={`pointer-events-none absolute left-1/2 top-1.5 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border font-mono text-[10px] font-semibold will-change-transform ${
          active
            ? "border-[#2e7d32]! bg-[#2e7d32]! text-white! opacity-100 shadow-[0_4px_18px_-6px_rgba(46,125,50,0.12)]"
            : "border-black/20 bg-white text-[color:var(--ink-muted)]! opacity-0"
        }`}
        style={{
          transform: active ? "translate(-50%, 26px)" : "translate(-50%, 0)",
          // Asymmetric transition: going down (inactive → active) glides
          // smoothly, fading in as it slides. Going back up (active →
          // inactive) instead fades out fast and *delays* the position
          // reset until after the fade completes — so the upward travel
          // is never visible. CSS picks up the destination state's
          // transition rule on the property change.
          transition: active
            ? "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease"
            : "transform 0s linear 0.22s, opacity 0.18s ease",
        }}
      >
        {letter}
      </span>
    </div>
  );
}

function SharedLayer({
  title,
  active,
  entries,
  footer,
}: {
  title: string;
  active: boolean;
  entries: Map<string, string>;
  footer?: React.ReactNode;
}) {
  return (
    <section className={`${SHARED_BASE} ${active ? SHARED_ACTIVE : ""}`}>
      <div className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
        {title}
      </div>
      {entries.size === 0 ? (
        <div className="py-1.5 text-[11px] text-white/50">empty</div>
      ) : (
        <ul className={`${ROW_RESET} grid gap-1`}>
          {Array.from(entries.entries()).map(([k, v]) => (
            <li
              key={k}
              className="flex items-baseline justify-between gap-3 border-b border-dashed border-white/10 py-1.5 text-[12px] last:border-b-0"
            >
              <code className="bg-transparent! p-0! font-mono text-[12px] text-[#f3f3f0]!">{k}</code>
              <span className="text-[11.5px] text-[#b6f0a5]">{v}</span>
            </li>
          ))}
        </ul>
      )}
      {footer ? (
        <div className="mt-2.5 border-t border-dashed border-white/10 pt-2.5">{footer}</div>
      ) : null}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className={STAT_CELL}>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
        {label}
      </div>
      <div className="font-sans text-2xl font-semibold leading-none tracking-[-0.02em] tabular-nums text-[color:var(--ink)]">
        {value}
      </div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--ink-muted)]">
        {sub}
      </div>
    </div>
  );
}

function LegendDot({ label, tone }: { label: string; tone: keyof typeof LEGEND_TONE }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${LEGEND_TONE[tone]}`}>
      <span className="h-[7px] w-[7px] rounded-full bg-current opacity-90" />
      {label}
    </span>
  );
}
