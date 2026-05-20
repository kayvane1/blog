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
    <section className="cache-sim not-prose" aria-label="Multi-level cache simulator">
      <header className="cache-sim__header">
        <div className="cache-sim__title">
          <span className="cache-sim__eyebrow">live simulator</span>
          <h3>Cross-container cache flow</h3>
          <p>Two containers · one Modal Dict · one database · one distributed lock.</p>
        </div>
        <div className="cache-sim__legend">
          <LegendDot label="hit" tone="hit" />
          <LegendDot label="miss" tone="miss" />
          <LegendDot label="lock" tone="lock" />
          <LegendDot label="compute" tone="compute" />
        </div>
      </header>

      <div className="cache-sim__controls">
        <div className="cache-sim__group">
          <span className="cache-sim__label">key</span>
          <div className="cache-sim__chips">
            {keyChips.map((k) => (
              <button
                key={k}
                type="button"
                className={`cache-sim__chip${activeKey === k ? " is-active" : ""}`}
                onClick={() => setActiveKey(k)}
                disabled={busy}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="cache-sim__group">
          <span className="cache-sim__label">speed</span>
          <div className="cache-sim__chips">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                className={`cache-sim__chip${speed === s ? " is-active" : ""}`}
                onClick={() => setSpeed(s)}
                disabled={busy}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
        <div className="cache-sim__actions">
          <button
            type="button"
            className="cache-sim__btn"
            onClick={() => runSingle("A")}
            disabled={busy}
          >
            <span className="cache-sim__btn-kbd">A</span>
            get
          </button>
          <button
            type="button"
            className="cache-sim__btn"
            onClick={() => runSingle("B")}
            disabled={busy}
          >
            <span className="cache-sim__btn-kbd">B</span>
            get
          </button>
          <button
            type="button"
            className="cache-sim__btn cache-sim__btn--accent"
            onClick={runThunderingHerd}
            disabled={busy}
          >
            herd · A+B
          </button>
          <button
            type="button"
            className="cache-sim__btn cache-sim__btn--ghost"
            onClick={invalidate}
            disabled={busy}
          >
            invalidate
          </button>
          <button
            type="button"
            className="cache-sim__btn cache-sim__btn--ghost"
            onClick={reset}
            disabled={busy}
          >
            reset
          </button>
        </div>
      </div>

      <div className="cache-sim__statbar">
        <Stat label="L1" sub="hits" value={stats.l1Hits} />
        <Stat label="L2" sub="hits" value={stats.l2Hits} />
        <Stat label="L3" sub="hits" value={stats.l3Hits} />
        <Stat label="compute" sub="runs" value={stats.computes} />
        <Stat label="herd" sub="collapsed" value={stats.collapsedHerds} />
      </div>

      <div className="cache-sim__board">
        <div className="cache-sim__containers">
          {(["A", "B"] as ContainerId[]).map((id) => {
            const c = containers[id];
            return (
              <article
                key={id}
                className={`cache-sim__node${c.highlight ? " is-active" : ""}`}
                aria-label={`container ${id}`}
              >
                <div className="cache-sim__node-head">
                  <span className="cache-sim__node-tag">
                    <span className="cache-sim__node-badge">{id}</span>
                    container {id}
                  </span>
                  <button
                    type="button"
                    className="cache-sim__mini"
                    onClick={() => evictL1(id)}
                    disabled={busy}
                  >
                    restart
                  </button>
                </div>
                <div className="cache-sim__node-meta">L1 · LRU · in-process</div>
                {c.l1.size === 0 ? (
                  <div className="cache-sim__empty">empty cache</div>
                ) : (
                  <ul className="cache-sim__entries">
                    {Array.from(c.l1.entries()).map(([k, v]) => (
                      <li key={k} className="cache-sim__entry">
                        <code>{k}</code>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="cache-sim__node-status">{c.status}</div>
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
            <div className="cache-sim__lock">
              {shared.lock ? (
                <>
                  <span className="cache-sim__lock-dot" />
                  <span>
                    lock <code>{shared.lock.key}</code> · held by container {shared.lock.holder}
                    {shared.lock.waiters.length > 0 ? (
                      <> · {shared.lock.waiters.length} waiting</>
                    ) : null}
                  </span>
                </>
              ) : (
                <span className="cache-sim__lock-idle">no lock held · Modal Queue idle</span>
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

      <div className="cache-sim__log" aria-live="polite">
        <div className="cache-sim__log-head">
          <span>event stream</span>
          <span className="cache-sim__log-hint">latest first</span>
        </div>
        {log.length === 0 ? (
          <p className="cache-sim__log-empty">streaming output appears here</p>
        ) : (
          <ul>
            {log.map((entry) => (
              <li key={entry.id} className={`cache-sim__log-row tone-${entry.tone}`}>
                <span className="cache-sim__log-tag">
                  {entry.container === "system" ? "sys" : entry.container}
                </span>
                <span className="cache-sim__log-text">{entry.text}</span>
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
    <div className={`cache-sim__lanes${single ? " is-single" : ""}`} aria-hidden>
      <div className={`cache-sim__lane${aActive ? " is-active" : ""}`}>
        <span className="cache-sim__lane-rail" />
        <span className="cache-sim__lane-token">A</span>
      </div>
      {!single ? (
        <div className={`cache-sim__lane${bActive ? " is-active" : ""}`}>
          <span className="cache-sim__lane-rail" />
          <span className="cache-sim__lane-token">B</span>
        </div>
      ) : null}
      {label ? <span className="cache-sim__lane-label">{label}</span> : null}
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
    <section className={`cache-sim__shared${active ? " is-active" : ""}`}>
      <div className="cache-sim__shared-head">{title}</div>
      {entries.size === 0 ? (
        <div className="cache-sim__empty cache-sim__empty--dark">empty</div>
      ) : (
        <ul className="cache-sim__entries cache-sim__entries--dark">
          {Array.from(entries.entries()).map(([k, v]) => (
            <li key={k} className="cache-sim__entry cache-sim__entry--dark">
              <code>{k}</code>
              <span>{v}</span>
            </li>
          ))}
        </ul>
      )}
      {footer ? <div className="cache-sim__shared-foot">{footer}</div> : null}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="cache-sim__stat">
      <div className="cache-sim__stat-label">{label}</div>
      <div className="cache-sim__stat-value">{value}</div>
      <div className="cache-sim__stat-sub">{sub}</div>
    </div>
  );
}

function LegendDot({ label, tone }: { label: string; tone: "hit" | "miss" | "lock" | "compute" }) {
  return (
    <span className={`cache-sim__legend-item tone-${tone}`}>
      <span className="cache-sim__legend-dot" />
      {label}
    </span>
  );
}
