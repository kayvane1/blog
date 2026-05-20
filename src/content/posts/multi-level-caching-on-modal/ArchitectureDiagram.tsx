import { ArrowDownUp } from "lucide-react";

const accent = "#2e7d32";
const accentSoft = "rgba(46, 125, 50, 0.14)";

const ROW =
  "grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-center gap-7 max-[640px]:grid-cols-1 max-[640px]:gap-3";

export function ArchitectureDiagram() {
  return (
    <figure
      className="not-prose my-9 rounded-3xl border border-black/10 bg-white p-8 pb-9 font-mono text-[color:var(--ink)] shadow-[0_22px_60px_-45px_rgba(20,20,19,0.35)]"
      aria-label="Cache architecture diagram"
    >
      <div className="grid gap-0">
        <div className={ROW}>
          <div className="grid grid-cols-2 gap-3 rounded-[0.85rem] border border-black/10 bg-black/[0.02] p-4">
            <ContainerCell label="container A" />
            <ContainerCell label="container B" />
          </div>
          <Caption title="L1" name="in-process LRU" sub="cheapest · per-container" />
        </div>

        <Rule />

        <div className={ROW}>
          <div className="grid grid-cols-2 gap-3 rounded-[0.85rem] border border-black/10 bg-black/[0.02] p-4">
            <BarCell text="Modal Dict" sub="shared store · lock" />
            <BarCell text="Modal Queue" sub="waiter notify" />
          </div>
          <Caption title="L2" name="Modal Dict + Queue" sub="shared · coordination" />
        </div>

        <Rule />

        <div className={ROW}>
          <div className="flex min-h-16 items-center justify-center rounded-[0.85rem] border border-black/10 bg-black/[0.02] px-4 py-4">
            <span className="text-[15px] tracking-[0.05em] text-[color:var(--ink)]">Database</span>
          </div>
          <Caption title="L3" name="Database" sub="source of truth · network hop" />
        </div>
      </div>
    </figure>
  );
}

function ContainerCell({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[0.65rem] border border-dashed border-black/20 bg-white px-3.5 py-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
        {label}
      </span>
      <span className="inline-flex items-center justify-center rounded-[0.4rem] border border-black/20 bg-black/[0.04] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink)]">
        LRU
      </span>
    </div>
  );
}

function BarCell({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[0.65rem] border border-dashed border-black/20 bg-white px-3 py-4 text-center">
      <span className="text-[15px] tracking-[0.05em] text-[color:var(--ink)]">{text}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-muted)]">
        {sub}
      </span>
    </div>
  );
}

function Caption({ title, name, sub }: { title: string; name: string; sub: string }) {
  return (
    <aside className="flex flex-col gap-1 border-l border-black/10 pl-5 max-[640px]:border-l-0 max-[640px]:border-t max-[640px]:border-black/10 max-[640px]:pl-0 max-[640px]:pt-2.5">
      <span
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: accent }}
      >
        {title}
      </span>
      <span className="font-sans text-base font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
        {name}
      </span>
      <span className="text-xs text-[color:var(--ink-muted)]">{sub}</span>
    </aside>
  );
}

function Rule() {
  return (
    <div
      className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-7 max-[640px]:grid-cols-1"
      aria-hidden
    >
      <div className="flex flex-col items-center self-stretch py-1.5">
        <RuleSegment />
        <span
          className="my-0.5 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-black/20 bg-white text-[color:var(--ink-muted)]"
          style={{ borderColor: accentSoft }}
        >
          <ArrowDownUp size={12} strokeWidth={1.5} />
        </span>
        <RuleSegment />
      </div>
      <span className="max-[640px]:hidden" />
    </div>
  );
}

function RuleSegment() {
  return (
    <span
      className="block h-3.5 w-px bg-repeat-y bg-[length:1px_5px]"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(20,20,19,0.2) 0%, rgba(20,20,19,0.2) 50%, transparent 50%, transparent 100%)",
      }}
    />
  );
}
