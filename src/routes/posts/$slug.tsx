import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { TagPill } from "../../components/TagPill";
import { getPostBySlug } from "../../lib/posts";
import { SITE, absoluteUrl } from "../../lib/site";

export const Route = createFileRoute("/posts/$slug")({
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    const { Component: _Component, ...meta } = post;
    return meta;
  },
  head: ({ loaderData }) => {
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
  const articleRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <ReadingProgress target={articleRef} />
      <main className="min-h-[100dvh] px-6 pb-24 pt-10 md:px-10 md:pt-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
          <div className="flex items-center justify-between">
            <Link className="link-arrow group" to="/">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              index
            </Link>
            <span className="numeric text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Kayvane / Notes
            </span>
          </div>

          <article
            ref={articleRef}
            className="grid grid-cols-1 gap-12 md:grid-cols-[200px_1fr] md:gap-16"
          >
            <aside className="md:sticky md:top-16 md:self-start">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="eyebrow">Published</p>
                  <p className="numeric mt-1 text-[13px] text-[color:var(--ink)]">
                    {formatDate(post.date)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Reading</p>
                  <p className="numeric mt-1 text-[13px] text-[color:var(--ink)]">
                    {post.readingTime}
                  </p>
                </div>
                {post.tags.length ? (
                  <div>
                    <p className="eyebrow">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <TagPill key={tag}>{tag}</TagPill>
                      ))}
                    </div>
                  </div>
                ) : null}
                {post.github ? (
                  <div>
                    <p className="eyebrow">Source</p>
                    <a
                      className="group mt-1 inline-flex items-center gap-1.5 text-[13px] text-[color:var(--ink)] transition hover:text-[color:var(--accent)]"
                      href={post.github}
                      target="_blank"
                      rel="noreferrer"
                    >
                      repo
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </div>
                ) : null}
              </div>
            </aside>

            <div>
              <motion.header
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <p className="eyebrow">Entry</p>
                <h1 className="mt-3 font-display text-[2.5rem] leading-[1.05] tracking-tight text-[color:var(--ink)] md:text-[3.25rem]">
                  {post.title}
                </h1>
                {post.summary ? (
                  <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-[color:var(--ink-muted)]">
                    {post.summary}
                  </p>
                ) : null}
              </motion.header>

              <div className="mt-10 h-px w-full bg-[color:var(--rule)]" />

              <div className="post-content mt-10">{PostBody ? <PostBody /> : null}</div>

              <div className="mt-16 flex flex-col gap-4 border-t border-[color:var(--rule-soft)] pt-8 md:flex-row md:items-center md:justify-between">
                <Link className="link-arrow group" to="/">
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                  back to index
                </Link>
                <span className="numeric text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  end of entry
                </span>
              </div>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}

function ReadingProgress({ target }: { target: React.RefObject<HTMLDivElement | null> }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(target.current !== null);
  }, [target]);

  const { scrollYProgress } = useScroll({
    target: ready ? target : undefined,
    offset: ["start start", "end end"],
  });
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 });

  return (
    <div className="reading-progress" aria-hidden>
      <motion.span style={{ scaleX, transformOrigin: "0% 50%" }} />
    </div>
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
