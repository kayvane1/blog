import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { TagPill } from "../../components/TagPill";
import { getChapter } from "../../lib/chapters";
import { getAllPosts, getPostBySlug } from "../../lib/posts";
import { SITE, absoluteUrl } from "../../lib/site";

export const Route = createFileRoute("/posts/$slug")({
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    // The Component is a React function and cannot be serialized for SSR
    // hydration. Strip it from the loader payload; the route component
    // re-looks it up by slug at render time (the post map is module-level
    // and identical on client + server).
    const { Component: _Component, ...meta } = post;
    return meta;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const title = `${loaderData.title} | ${SITE.name}`;
    const description = loaderData.summary;
    const canonical = absoluteUrl(`/posts/${loaderData.slug}`);
    const publishedAt = toIsoDate(loaderData.date);
    const keywords = loaderData.tags.length ? loaderData.tags : undefined;
    const timeRequired = readingTimeToIso(loaderData.readingTime);
    const personId = `${SITE.url}/#person`;
    const websiteId = `${SITE.url}/#website`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${canonical}#article`,
      headline: loaderData.title,
      description,
      datePublished: publishedAt,
      dateModified: publishedAt,
      author: {
        "@id": personId,
        name: SITE.name,
      },
      publisher: {
        "@id": personId,
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical,
      },
      url: canonical,
      keywords,
      wordCount: loaderData.wordCount,
      inLanguage: SITE.language,
      isPartOf: {
        "@id": websiteId,
      },
      timeRequired,
    };

    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonical },
      { property: "og:type", content: "article" },
      publishedAt ? { property: "article:published_time", content: publishedAt } : undefined,
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ].filter(Boolean);

    return {
      meta,
      links: [{ rel: "canonical", href: canonical }],
      headScripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData();
  const full = getPostBySlug(post.slug);
  const PostBody = full?.Component;
  const { accent } = getChapter(post.slug);

  const posts = getAllPosts();
  const position = posts.findIndex((p) => p.slug === post.slug);
  const newer = position > 0 ? posts[position - 1] : undefined;
  const older = position >= 0 && position < posts.length - 1 ? posts[position + 1] : undefined;

  return (
    <main
      className="min-h-screen bg-[color:var(--page)] px-6 pb-24 pt-10 text-[color:var(--page-ink)]"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <div className="mx-auto flex max-w-2xl flex-col">
        <div className="flex items-baseline justify-between">
          <Link
            className="link-arrow group w-fit opacity-70 transition-opacity hover:opacity-100"
            to="/"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            index
          </Link>
          {post.github ? (
            <a
              className="link-arrow group opacity-70 transition-opacity hover:opacity-100"
              href={post.github}
              target="_blank"
              rel="noreferrer"
            >
              repo
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </a>
          ) : null}
        </div>

        <article className="mt-16">
          <header>
            <p className="meta-label" style={{ color: "var(--accent-deep)" }}>
              {formatDate(post.date)} · {post.readingTime}
            </p>
            <h1
              className="display mt-5"
              style={{ fontSize: "clamp(2.1rem, 1.2rem + 3.4vw, 3.6rem)" }}
            >
              {post.title}
            </h1>
            <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-[color:var(--page-dim)]">
              {post.summary}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[color:var(--page-dim)]">
              {post.tags.map((tag) => (
                <TagPill key={tag}>{tag}</TagPill>
              ))}
            </div>
          </header>

          <div
            className="mt-12 border-t pt-10"
            style={{ borderColor: "color-mix(in oklab, var(--accent-deep) 35%, transparent)" }}
          >
            <div className="post-content">{PostBody ? <PostBody /> : null}</div>
          </div>
        </article>

        {newer || older ? (
          <nav
            aria-label="More posts"
            className="mt-20 grid gap-6 border-t pt-8 sm:grid-cols-2"
            style={{ borderColor: "color-mix(in oklab, var(--page-ink) 12%, transparent)" }}
          >
            {older ? <AdjacentPost label="older" post={older} align="left" /> : <span />}
            {newer ? <AdjacentPost label="newer" post={newer} align="right" /> : null}
          </nav>
        ) : null}
      </div>
    </main>
  );
}

function AdjacentPost({
  label,
  post,
  align,
}: {
  label: string;
  post: { slug: string; title: string };
  align: "left" | "right";
}) {
  const { accent } = getChapter(post.slug);
  return (
    <Link
      to="/posts/$slug"
      params={{ slug: post.slug }}
      className={`group flex flex-col gap-2 ${align === "right" ? "sm:items-end sm:text-right" : ""}`}
      style={{ "--row-accent": accent } as React.CSSProperties}
    >
      <span className="meta-label opacity-50">{label}</span>
      <span className="text-[15px] font-semibold leading-snug transition-colors group-hover:[color:color-mix(in_oklab,var(--row-accent)_52%,black)]">
        {post.title}
      </span>
    </Link>
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

function toIsoDate(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function readingTimeToIso(value: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/\d+/);
  if (!match) return undefined;
  return `PT${match[0]}M`;
}
