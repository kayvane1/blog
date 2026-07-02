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
    <aside
      className="not-prose my-8 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 rounded-xl px-5 py-4 max-md:grid-cols-1"
      style={{ background: "color-mix(in oklab, var(--page-ink) 5%, transparent)" }}
    >
      <span
        className="meta-label mt-0.5 inline-flex items-center"
        style={{ color: "var(--accent-deep)" }}
      >
        TL;DR
      </span>
      {/* div, not p: MDX may already wrap the children in a paragraph */}
      <div className="text-[15px] leading-relaxed text-[color:var(--page-ink)] [&>p]:m-0">
        {children}
      </div>
    </aside>
  );
}
