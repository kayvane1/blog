# Domain language

Authoritative terms for this codebase. Use these names exactly in code, prose,
commits, and reviews. Names that aren't in this file aren't yet load-bearing —
when one becomes load-bearing, add it here.

## Post bundle

A self-contained directory under `src/content/posts/<slug>/` that owns one
published article. A post bundle holds:

- `index.mdx` — the prose plus any JSX-embedded interactive components.
- Optional `*.tsx` files for **post-specific interactive components** (see below).
- Optional Tailwind class composition or co-located styling for those components.
- Optional `meta.ts` / Zod schema for typed frontmatter validation.

A post bundle's interface is its directory. Everything a maintainer needs to
read, edit, or delete the post is inside that directory. Deleting the directory
removes the post atomically.

The route layer (`src/routes/posts/$slug.tsx`) does not know which interactives
any given bundle uses; it loads `index.mdx` as a React module and the post
declares its own imports.

## Post-specific interactive component

A React component whose only consumer is one post bundle. Lives inside the
bundle directory. Named for what it does in that post (`CacheSimulator`,
`CoordinationDiagram`, `ArchitectureDiagram`).

Distinguished from a **shared primitive** by usage count. Components stay
post-specific until at least two bundles import them — at which point they are
promoted to `src/components/`.

## Shared primitive

A reusable React component intended to be imported by multiple post bundles
(e.g. a hypothetical `<Figure>` / `<Stage>` / `<EventLog>`). Lives in
`src/components/` alongside other site-wide components. Currently empty of
post-derived primitives; will populate once a second bundle confirms a shape.

## Frontmatter

YAML between `---` fences at the top of an `index.mdx` file. Extracted by
`remark-frontmatter` + `remark-mdx-frontmatter` and exposed as a `meta` named
export. Validated at load time against a Zod schema in `src/lib/posts.ts`.

## Reading time

An estimate of how long the post takes to read. Computed at build time from the
non-JSX text of `index.mdx` (JSX nodes are excluded so embedded components
don't inflate the count). Authors may override the estimate via a
`readingTime` field in the frontmatter when the auto-estimate is wrong.
