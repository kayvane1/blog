import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Github, Linkedin, Mail, Search, X } from "lucide-react";

import { TagPill } from "../components/TagPill";
import { getAllPosts, type PostMeta } from "../lib/posts";
import { SITE, absoluteUrl } from "../lib/site";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "Kayvane | ML Notes";
    const description = SITE.description;
    const canonical = absoluteUrl();
    const personId = `${SITE.url}/#person`;
    const websiteId = `${SITE.url}/#website`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": personId,
          name: SITE.name,
          url: SITE.url,
          sameAs: SITE.socials
            .map((social) => social.href)
            .filter((href) => !href.startsWith("mailto:")),
        },
        {
          "@type": "WebSite",
          "@id": websiteId,
          url: SITE.url,
          name: SITE.name,
          description,
          publisher: {
            "@id": personId,
          },
          inLanguage: SITE.language,
        },
      ],
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: canonical }],
      headScripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  component: Home,
});

// Module-level so the reference is stable across renders. Posts are static MDX
// resolved at build time; there's no benefit to re-reading on each render.
const ALL_POSTS: PostMeta[] = getAllPosts();
const POST_HAYSTACKS: Array<{ post: PostMeta; haystack: string }> = ALL_POSTS.map((post) => ({
  post,
  haystack: [post.title, post.summary, post.tags.join(" ")].join(" ").toLowerCase(),
}));

const socialIcons: Record<string, (props: { className?: string }) => JSX.Element> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  X,
  Email: Mail,
};

function Home() {
  const [query, setQuery] = useState("");
  // Defer the filter so the input itself stays snappy even on slow keystrokes.
  // For 8 posts this is overkill, but it's free insurance against future growth.
  const deferredQuery = useDeferredValue(query);

  const filteredPosts = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return ALL_POSTS;
    const tokens = normalized.split(/\s+/);
    return POST_HAYSTACKS.filter(({ haystack }) =>
      tokens.every((token) => haystack.includes(token)),
    ).map(({ post }) => post);
  }, [deferredQuery]);

  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;

  return (
    <main className="min-h-[100dvh] px-6 pb-24 pt-10 md:px-10 md:pt-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
        <TopBar />

        <Hero />

        <section>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--ink-faint)]" />
            <label className="sr-only" htmlFor="post-search">
              Search posts
            </label>
            <input
              id="post-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="Search by title, snippet, or tag"
              autoComplete="off"
              spellCheck={false}
              className="search-input"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-1 text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {isFiltering ? (
            <p
              className="mt-4 numeric text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-muted)]"
              aria-live="polite"
            >
              {filteredPosts.length} of {ALL_POSTS.length} match “{query.trim()}”
            </p>
          ) : null}

          <ol className="mt-8 list-none">
            {ALL_POSTS.length === 0 ? (
              <li className="py-10 text-[color:var(--ink-muted)]">First note coming soon.</li>
            ) : filteredPosts.length === 0 ? (
              <li className="py-10 text-[color:var(--ink-muted)]">
                No matches. Try a different search.
              </li>
            ) : (
              filteredPosts.map((post) => <IndexRow key={post.slug} post={post} />)
            )}
          </ol>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <div className="flex items-center justify-between">
      <Link
        to="/"
        className="numeric flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-[color:var(--ink)]"
      >
        <span className="inline-block h-2 w-2 rotate-45 bg-[color:var(--accent)]" />
        Kayvane / Notes
      </Link>
      <div className="hidden items-center gap-6 md:flex">
        {SITE.socials.map((social) => {
          const Icon = socialIcons[social.label] ?? ArrowUpRight;
          return (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)] transition hover:text-[color:var(--ink)]"
            >
              <Icon className="h-3.5 w-3.5" />
              {social.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_0.6fr] md:items-end">
      <div>
        <h1 className="display-xl">
          Writing things down{" "}
          <span className="display-italic" style={{ color: "var(--accent)" }}>
            for later.
          </span>
        </h1>
      </div>

      <div className="flex flex-col gap-5 border-t border-[color:var(--rule-soft)] pt-6 md:border-t-0 md:pt-0">
        <p className="max-w-[28ch] text-[15px] leading-relaxed text-[color:var(--ink-muted)]">
          {SITE.intro}
        </p>
        <div className="flex flex-col gap-2.5">
          <a
            className="group inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-[color:var(--ink)] transition hover:text-[color:var(--accent)]"
            href={SITE.githubRepo}
            target="_blank"
            rel="noreferrer"
          >
            <span className="h-px w-6 bg-[color:var(--ink)] transition-all group-hover:w-9 group-hover:bg-[color:var(--accent)]" />
            blog source
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function IndexRow({ post }: { post: PostMeta }) {
  const navigate = useNavigate();
  const goToPost = () => {
    navigate({ to: "/posts/$slug", params: { slug: post.slug } });
  };

  return (
    <li
      className="index-row group"
      role="link"
      tabIndex={0}
      aria-label={`Read ${post.title}`}
      onClick={goToPost}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToPost();
        }
      }}
    >
      <span className="numeric text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
        {formatDate(post.date)}
      </span>

      <div className="min-w-0">
        <h3 className="index-title">{post.title}</h3>
        <p className="index-summary">{post.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {post.tags.slice(0, 4).map((tag) => (
            <TagPill key={tag}>{tag}</TagPill>
          ))}
        </div>
      </div>

      <span className="numeric hidden text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] md:inline-flex md:items-center md:gap-2">
        {post.readingTime}
        <ArrowUpRight className="h-3.5 w-3.5 text-[color:var(--ink-muted)] transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[color:var(--accent)]" />
      </span>
    </li>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-10 grid grid-cols-1 gap-6 border-t border-[color:var(--rule-soft)] pt-8 md:grid-cols-[1fr_auto] md:items-end">
      <p className="max-w-[42ch] text-[13px] leading-relaxed text-[color:var(--ink-muted)]">
        {SITE.description}
      </p>
      <p className="numeric text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
        Kayvane Shakerifar · {new Date().getFullYear()}
      </p>
    </footer>
  );
}

function formatDate(value: string): string {
  if (!value) return "draft";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}
