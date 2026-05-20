import { z } from "zod";

import type { ComponentType } from "react";

import { Tag, isTag } from "./tags";

/**
 * Frontmatter schema. Validated at load time so a typo in any post's
 * frontmatter surfaces as a Zod error rather than silently rendering with
 * undefined fields.
 */
const FrontmatterSchema = z.object({
  title: z.string(),
  date: z.string(),
  summary: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  readingTime: z.string().optional(),
  github: z.string().optional(),
  script: z.string().optional(),
});

type RawFrontmatter = z.infer<typeof FrontmatterSchema>;

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: Tag[];
  readingTime: string;
  github?: string;
  script?: string;
};

export type Post = PostMeta & {
  Component: ComponentType;
  wordCount: number;
};

type MdxModule = {
  default: ComponentType;
  frontmatter?: RawFrontmatter;
};

// MDX modules — gives us the rendered component + parsed frontmatter.
const modules = import.meta.glob("../content/posts/*/index.mdx", {
  eager: true,
}) as Record<string, MdxModule>;

// Raw source — needed for word-count / reading-time estimation, where we
// strip JSX so embedded components don't inflate the count.
const rawSources = import.meta.glob("../content/posts/*/index.mdx", {
  eager: true,
  query: "?raw",
}) as Record<string, unknown>;

const posts: Post[] = Object.entries(modules)
  .map(([path, mod]) => toPost(path, mod, readSource(rawSources[path])))
  .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

function readSource(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "default" in value) {
    const inner = (value as { default: unknown }).default;
    if (typeof inner === "string") return inner;
  }
  return "";
}

const postsBySlug = new Map(posts.map((post) => [post.slug, post]));

export const getAllPosts = (): PostMeta[] =>
  posts.map(({ Component: _Component, wordCount: _wordCount, ...meta }) => meta);

export const getPostBySlug = (slug: string): Post | undefined => postsBySlug.get(slug);

function toPost(path: string, mod: MdxModule, rawSource: string): Post {
  const slug = slugFromPath(path);
  const frontmatter = FrontmatterSchema.parse(mod.frontmatter ?? {});

  const wordCount = countWords(stripJsx(stripFrontmatterBlock(rawSource)));
  const readingTime = frontmatter.readingTime ?? `${estimateReadingTime(wordCount)} min`;

  return {
    slug,
    title: frontmatter.title,
    date: frontmatter.date,
    summary: frontmatter.summary ?? createSummary(rawSource),
    tags: normalizeTags(frontmatter.tags),
    readingTime,
    github: frontmatter.github,
    script: frontmatter.script,
    Component: mod.default,
    wordCount,
  };
}

function slugFromPath(path: string): string {
  // path looks like "../content/posts/<slug>/index.mdx"
  const match = path.match(/\/posts\/([^/]+)\/index\.mdx$/);
  return match?.[1] ?? "post";
}

function stripFrontmatterBlock(raw: string): string {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1] : raw;
}

/**
 * Strip JSX elements and expressions so the word count only reflects prose.
 *
 * - Drops everything between matched `<Tag>` … `</Tag>` pairs and self-closing
 *   `<Tag … />` elements.
 * - Drops standalone `{expression}` blocks at the start of a line.
 * - Drops MDX import / export statements.
 */
function stripJsx(source: string): string {
  return source
    .replace(/^(?:import|export)\s[^\n]*$/gm, "")
    .replace(/<([A-Z][\w.]*)\b[^>]*\/>/g, "")
    .replace(/<([A-Z][\w.]*)\b[^>]*>[\s\S]*?<\/\1>/g, "")
    .replace(/<[a-z]+\s+data-[^>]*\/>/g, "");
}

function normalizeTags(value: string | string[] | undefined): Tag[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : value.split(",");
  return items.map((item) => item.trim().toLowerCase()).filter(isTag);
}

function createSummary(rawSource: string): string {
  const body = stripFrontmatterBlock(rawSource);
  const plain = stripJsx(body)
    .replace(/[#>*`]/g, "")
    .trim();
  const firstParagraph = plain.split(/\n\n+/)[0] ?? "";
  return firstParagraph.slice(0, 160);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 220));
}

function toTimestamp(date: string): number {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}
