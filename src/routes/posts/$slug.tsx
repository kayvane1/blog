import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { TagPill } from "../../components/TagPill";
import { getPostBySlug } from "../../lib/posts";

export const Route = createFileRoute("/posts/$slug")({
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData.title} | Kayvane`,
      },
      {
        name: "description",
        content: loaderData.summary,
      },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData();

  return (
    <main className="min-h-screen px-6 pb-20 pt-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <Link className="link-arrow group w-fit" to="/">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          back to home
        </Link>

        <article className="paper-card relative overflow-hidden px-6 py-10 md:px-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-emerald-50/60" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
              <span className="font-mono">{formatDate(post.date)}</span>
              <span className="font-mono">{post.readingTime}</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-[color:var(--ink)] md:text-4xl">
              {post.title}
            </h1>
            <p className="mt-3 text-base text-[color:var(--ink-muted)]">{post.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagPill key={tag}>{tag}</TagPill>
              ))}
            </div>
            {post.github ? (
              <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                <a className="link-arrow group" href={post.github} target="_blank" rel="noreferrer">
                  repo
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            ) : null}
            <div className="mt-10 border-t border-black/5 pt-8">
              <div className="post-content" dangerouslySetInnerHTML={{ __html: post.html }} />
            </div>
          </div>
        </article>
      </div>
    </main>
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
