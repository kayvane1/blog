# ADR 0001 — Post bundles with MDX

- **Status:** Accepted
- **Date:** 2026-05-20
- **Supersedes:** —

## Context

The blog originally treated each post as a single flat markdown file at
`src/content/posts/<slug>.md`, rendered via `marked` into HTML, then injected
into the post route via `dangerouslySetInnerHTML`. This was sufficient until
posts started embedding rich interactive components (animated diagrams,
simulators).

The first post with interactives (`multi-level-caching-on-modal`) spread its
implementation across four locations:

1. Prose in `src/content/posts/<slug>.md`.
2. Components in `src/components/{ArchitectureDiagram,CacheSimulator,CoordinationDiagram}.tsx`.
3. An `INTERACTIVES` map and HTML-regex marker splitter in `src/routes/posts/$slug.tsx`.
4. Roughly 170 lines of post-specific CSS in the global `src/styles.css`.

Adding a future post with interactives meant editing all four. The
marker → component link was string-keyed and verified at runtime via regex
match, with no compile-time guarantee that a marker referenced a registered
component. Component naming did not distinguish post-specific code from
site-wide code.

The author has indicated future posts will continue to use interactive
components, so the friction will only compound.

## Decision

We adopt a **post bundle** model for all posts going forward, defined in
[CONTEXT.md](../../CONTEXT.md).

### 1. Migration scope — big bang

All existing flat-`.md` posts move into `src/content/posts/<slug>/index.mdx`
directories at the same time. Mixed flat / bundle modes are not supported.
A single consistent loader is simpler than carrying two readers.

### 2. Markdown processor — MDX

We replace `marked` with `@mdx-js/rollup`. Posts gain first-class TSX import
syntax and embed components directly. The `INTERACTIVES` registry and the
HTML-rewriting `splitContent` regex are deleted. Missing imports become
build-time errors.

### 3. Frontmatter — YAML in `---` fences, validated with Zod

`remark-frontmatter` + `remark-mdx-frontmatter` extract the YAML block and
expose it as a named `meta` export. A Zod schema in `src/lib/posts.ts`
validates `meta` at load time so that frontmatter typos surface as errors
rather than silent missing fields.

### 4. Reading time — non-JSX text count + optional frontmatter override

A build-time helper strips JSX nodes from the MDX source before counting
words, so embedded components do not inflate the estimate. Authors may
override the auto-estimate via an optional `readingTime` field in
frontmatter.

### 5. Styling — Tailwind utilities only

Post-specific styles move into Tailwind class composition on the components
themselves. The `cache-sim__*`, `arch-diagram__*`, and `coord-anim__*` BEM
blocks in `src/styles.css` are rewritten as Tailwind utilities (with
arbitrary values where Tailwind's scale doesn't cover the design). Global
`src/styles.css` keeps only site-wide styles (typography, layout, theme
tokens).

## Consequences

**Locality.** A post's prose, components, and styles live in one directory.
The deletion test passes: removing `src/content/posts/<slug>/` removes the
post and everything that supported it.

**Tooling cost.** One-time addition of three Vite plugins
(`@mdx-js/rollup`, `remark-frontmatter`, `remark-mdx-frontmatter`) and one
runtime dep (`zod`). Build pipeline grows slightly; runtime stays minimal.

**Migration cost.** Four existing posts must be moved into bundles in one
sweep. The cache post is the only one with interactives, so the other three
migrations are renames plus a frontmatter passthrough.

**Type safety.** Frontmatter shape is enforced by Zod, replacing the
hand-rolled parser. Component imports are checked at compile time.

**Tradeoffs deliberately accepted.**

- The single `src/styles.css` file becomes meaningfully smaller, but
  component styles spread across many Tailwind class lists. We accept that
  cost because the rest of the codebase is already Tailwind-first.
- Posts now have a directory each. The shallow `posts/*.md` layout is gone.
  We accept that cost because the alternative was four-place edits per post.

## Future work — when, not whether

Two adapters of the same chrome (header + caption + controls + timeline +
event log) exist today, in `CacheSimulator` and `CoordinationDiagram`. The
skill says one adapter is a hypothetical seam, two adapters is a real seam,
three adapters is when to extract. We defer extracting shared primitives
(`Figure`, `Stage`, `EventLog`, `StepTimeline`) into `src/components/` until
a third post bundle imports the same chrome. Premature extraction would lock
in shapes we don't fully understand yet.
