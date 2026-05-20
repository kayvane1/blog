import { ArrowDownUp } from "lucide-react";

export function ArchitectureDiagram() {
  return (
    <figure className="arch-diagram not-prose" aria-label="Cache architecture diagram">
      <div className="arch-diagram__stack">
        <div className="arch-diagram__row">
          <div className="arch-diagram__layer arch-diagram__layer--containers">
            <ContainerCell label="container A" />
            <ContainerCell label="container B" />
          </div>
          <Caption title="L1" name="in-process LRU" sub="cheapest · per-container" />
        </div>

        <Rule />

        <div className="arch-diagram__row">
          <div className="arch-diagram__layer arch-diagram__layer--pair">
            <div className="arch-diagram__bar-cell">
              <span className="arch-diagram__bar-text">Modal Dict</span>
              <span className="arch-diagram__bar-sub">shared store · lock</span>
            </div>
            <div className="arch-diagram__bar-cell">
              <span className="arch-diagram__bar-text">Modal Queue</span>
              <span className="arch-diagram__bar-sub">waiter notify</span>
            </div>
          </div>
          <Caption title="L2" name="Modal Dict + Queue" sub="shared · coordination" />
        </div>

        <Rule />

        <div className="arch-diagram__row">
          <div className="arch-diagram__layer arch-diagram__layer--bar">
            <span className="arch-diagram__bar-text">Database</span>
          </div>
          <Caption title="L3" name="Database" sub="source of truth · network hop" />
        </div>
      </div>
    </figure>
  );
}

function ContainerCell({ label }: { label: string }) {
  return (
    <div className="arch-diagram__container">
      <span className="arch-diagram__container-label">{label}</span>
      <span className="arch-diagram__chip">LRU</span>
    </div>
  );
}

function Caption({ title, name, sub }: { title: string; name: string; sub: string }) {
  return (
    <aside className="arch-diagram__caption">
      <span className="arch-diagram__caption-eyebrow">{title}</span>
      <span className="arch-diagram__caption-name">{name}</span>
      <span className="arch-diagram__caption-sub">{sub}</span>
    </aside>
  );
}

function Rule() {
  return (
    <div className="arch-diagram__rule-row" aria-hidden>
      <div className="arch-diagram__rule">
        <span className="arch-diagram__rule-line" />
        <span className="arch-diagram__rule-icon">
          <ArrowDownUp size={12} strokeWidth={1.5} />
        </span>
        <span className="arch-diagram__rule-line" />
      </div>
      <span />
    </div>
  );
}
