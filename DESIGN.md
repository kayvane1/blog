# Design

Visual system for kayvane.com. Two surfaces, one voice: the **deck** (homepage)
is dark, drenched, and kinetic; the **reader** (post pages) is light, quiet,
and typographic. See PRODUCT.md for the strategy behind this split.

## Core concept

Every article is a system; its homepage preview is that system *running*.
Each post gets a full-viewport pinned chapter whose scroll position scrubs a
bespoke SVG schematic (a "hero") teaching the post's core idea. Heroes live in
`src/components/heroes/`, one file per post, registered in
`src/lib/chapters.ts`, and obey the contract in
`src/components/heroes/types.ts`.

## Color

Tokens in `src/styles.css`, OKLCH throughout.

| Token | Value | Role |
|---|---|---|
| `--ink` | `oklch(0.145 0.02 265)` | deck surface (blue-cast near-black) |
| `--ghost` | `oklch(0.96 0.005 265)` | text on deck |
| `--page` | `oklch(0.97 0 0)` | reader surface (true off-white, chroma 0) |
| `--page-ink` | `oklch(0.22 0.012 265)` | reader text |
| `--page-dim` | `oklch(0.42 0.012 265)` | reader secondary text |
| `--accent` | per chapter | scoped inline per panel / post |
| `--accent-deep` | `color-mix(52% accent, black)` | accent usable on light ground |

Per-chapter accents (full-palette strategy — the accent is the chapter's
identity; structure stays ghost):

- singleflight → cyan `oklch(0.85 0.13 210)`
- event-driven → acid green `oklch(0.87 0.19 140)`
- agents → signal orange `oklch(0.78 0.15 55)`
- llm-tldr → yellow `oklch(0.89 0.15 95)`
- vllm → violet `oklch(0.76 0.14 300)`
- datadog apm → magenta `oklch(0.75 0.16 350)`
- farkle → red `oklch(0.7 0.18 25)`
- outlines → blue `oklch(0.76 0.11 250)`

New chapters pick an unused hue; the fallback (neutral `oklch(0.9 0.02 265)` +
generic pipeline hero) is a placeholder, not a destination.

## Typography

- **Archivo** (variable: wdth 62.5–125, wght 100–900) — everything.
  Display voice = `.display`: font-stretch 115%, weight 860, line-height 0.98,
  letter-spacing −0.015em, `text-wrap: balance`. Heading ceiling 6rem (intro
  name); chapter titles clamp to 4.3rem.
- **Fragment Mono** — data only: dates, reading times, chapter numbers, tags,
  SVG labels. Via `.meta-label` (11px, uppercase, 0.14em tracking).
- Reader body: 16px/1.75, max 68ch, `text-wrap: pretty`.

## Motion

- Scroll is the timeline: heroes derive every beat from a scrubbed `progress`
  MotionValue (framer-motion `useScroll` + `useTransform`); scrolling back
  replays in reverse. No scroll hijacking, no snap.
- Chapter mechanics: 320vh wrapper, sticky 100vh panel, −100vh overlap; the
  next chapter covers the previous (which scales to 0.94, dims, gains radius).
- Idle loops (pulses, wobbles) are subtle, ≥2s, and gated on
  `active && !reduced`.
- Hero SVG language: `GHOST_STROKE` 1.5px structure, accent 2px live elements,
  ≤5 mono labels, one optional radialGradient glow, no filters. **Prefix defs
  ids per hero** (`sf-`, `tw-`, …) — all heroes mount in one document.
- Reduced motion: plain stacked sections, heroes render their end state
  (progress pinned at 1), no loops, no scroll-linked transforms.

## Layout grammar (deck)

Per panel: chapter number `01 / 08` top-left in accent; date · reading time
top-right; hero scene right ~62% (top 42vh on mobile, masked to fade under
text); title bottom-left as the stretched link; summary ≤52ch clamped to 3
lines; tag chips in accent; scrub hairline along the bottom edge. Fixed chrome:
name + socials header, numbered chapter rail right (lg+, hides past the deck).

## Components

- `.tech-pill` — theme-agnostic tag chip, derives from `currentColor`.
- `.meta-label` — the mono data label.
- `.link-arrow` — mono action link with icon.
- `Tldr` — reader callout; div-wrapped children (MDX may emit its own `<p>`).
- Post-bundle interactives style themselves; the reader keeps `--ink-muted`
  as a legacy alias for them.
