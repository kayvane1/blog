# Product

> Drafted autonomously from the owner's redesign brief (2026-07-02). Review the
> Brand Personality and Anti-references sections; everything else is inferred
> from the codebase and the brief's named references.

## Register

brand

## Users

Engineers and technical readers arriving from links (X, LinkedIn, HN, search).
They come to read one article, or to size up the author. Context: a laptop or
phone, often at night, often mid-task. Two jobs: (1) read a specific post
comfortably; (2) browse the index and get a feel for what Kayvane works on.

## Product Purpose

Personal engineering blog for Kayvane Shakerifar — LLM infrastructure, agents,
distributed systems, observability. The homepage is a portfolio surface: it
should demonstrate the craft the posts describe. The post pages are reading
surfaces: comfort wins over spectacle.

## Brand Personality

Machined, kinetic, matter-of-fact. The voice of someone who builds schedulers
and cache layers and finds them beautiful. Confident without being loud in
prose — the loudness budget is spent on type scale and motion, not adjectives.

Core concept: **every article is a system; its preview shows the system
running.** Homepage animations are living schematics of each post's subject
(a singleflight lock collapsing a thundering herd, a paged KV cache
allocating, an FSM constraining generation) — never decorative particles.

Named references (from the owner): Razorpay Sprint 26 (kinetic type, saturated
color blocks), Thorgal (full-viewport chaptered scroll storytelling), Synapser
Studio and Auremin (refined motion, one idea per fold).

## Anti-references

- The previous site itself: warm paper cards, emerald accents, uniform card grid.
- Terminal/hacker dark mode (green-on-black mono everywhere) — the first-order
  reflex for a systems blog.
- Editorial-typographic lane (italic display serif + mono eyebrows + ruled
  columns) — the second-order reflex.
- Generic SaaS landing grammar: hero metrics, icon cards, gradient text.
- Decorative motion unrelated to content (floating blobs, parallax for its own
  sake, cursor gimmicks).

## Design Principles

1. **The animation is the abstract.** Each chapter's motion must teach the
   post's core idea in one glance; if it could decorate any other post, cut it.
2. **One idea per fold.** Full-viewport chapters, deliberate pacing, no
   competing content on screen.
3. **Deck is theatre, reader is a library.** The index is dark, drenched, and
   kinetic; the article page is light, quiet, and typographic. The contrast is
   the brand.
4. **Native scroll is sacred.** Pinning and scrubbing ride the scrollbar; no
   scroll hijacking, no forced snap fighting the wheel.
5. **Loudness budget.** Spend it on type scale and per-chapter color; prose,
   chrome, and UI copy stay plain.

## Accessibility & Inclusion

- WCAG AA contrast on all text (≥4.5:1 body, ≥3:1 large display type).
- Full `prefers-reduced-motion` alternative: static schematic frames, normal
  document flow, no scroll-linked transforms.
- Keyboard: every chapter reachable and readable via tab order; rail links are
  real anchors; no interaction locked behind hover or scroll position.
- Animations are SVG driven by transform/opacity/pathLength only — no layout
  thrash, no autoplaying video, nothing flashing above 3Hz.
