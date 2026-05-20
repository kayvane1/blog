import type { ReactNode } from "react";

type TldrProps = {
  children: ReactNode;
};

/**
 * TL;DR callout used at the top of posts. Renders an `<aside>` with a
 * monospace label pill and the post's summary inline.
 *
 * Authors write this directly in MDX:
 *
 * ```mdx
 * <Tldr>Three layers. L1 collapses…</Tldr>
 * ```
 */
export function Tldr({ children }: TldrProps) {
  return (
    <aside className="not-prose relative my-6 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-3xl border border-black/10 bg-[color:var(--paper-bright)] px-5 py-4 shadow-[0_18px_45px_-35px_rgba(20,20,19,0.35)] md:gap-4 max-md:grid-cols-1">
      <span className="inline-flex items-center rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink)]">
        TL;DR
      </span>
      <p className="m-0 text-[15px] leading-relaxed text-[color:var(--ink)]">{children}</p>
    </aside>
  );
}
