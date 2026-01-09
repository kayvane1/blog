import { marked } from "marked";

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  readingTime: string;
  github?: string;
  script?: string;
};

export type Post = PostMeta & {
  content: string;
  html: string;
  wordCount: number;
};

type Frontmatter = Record<string, string | string[]>;

const rawPosts = import.meta.glob("../content/posts/*.md", {
  eager: true,
  query: "?raw",
}) as Record<string, { default: string }>;

const posts = Object.entries(rawPosts)
  .map(([path, mod]) => toPost(path, mod.default))
  .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

const postsBySlug = new Map(posts.map((post) => [post.slug, post]));

export const getAllPosts = (): PostMeta[] =>
  posts.map(({ content: _content, html: _html, wordCount: _wordCount, ...meta }) => meta);

export const getPostBySlug = (slug: string): Post | undefined => postsBySlug.get(slug);

function toPost(path: string, raw: string): Post {
  const { data, content } = parseFrontmatter(raw);
  const slug = path.split("/").pop()?.replace(/\.md$/, "") ?? "post";
  const title = stringValue(data.title) ?? slugToTitle(slug);
  const date = stringValue(data.date) ?? "";
  const summary = stringValue(data.summary) ?? createSummary(content);
  const tags = normalizeTags(data.tags);
  const wordCount = countWords(content);
  const readingTime = stringValue(data.readingTime) ?? `${estimateReadingTime(wordCount)} min`;
  const html = stylizeTldr(marked.parse(content) as string);

  return {
    slug,
    title,
    date,
    summary,
    tags,
    readingTime,
    github: stringValue(data.github),
    script: stringValue(data.script),
    content,
    html,
    wordCount,
  };
}

function parseFrontmatter(raw: string): { data: Frontmatter; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: raw.trim() };
  }

  const data: Frontmatter = {};
  const dataBlock = match[1];
  const content = match[2].trim();

  for (const line of dataBlock.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) continue;
    const value = rest.join(":").trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      const items = value
        .slice(1, -1)
        .split(",")
        .map((item) => stripQuotes(item.trim()))
        .filter(Boolean);
      data[key.trim()] = items;
    } else {
      data[key.trim()] = stripQuotes(value);
    }
  }

  return { data, content };
}

function stylizeTldr(html: string): string {
  return html.replace(/<p><strong>TL;DR<\/strong>:\s*([\s\S]*?)<\/p>/i, (_match, body) => {
    const text = String(body).trim();
    const spacer = text ? " " : "";
    return `<aside class="tldr"><p><span class="tldr-label">TL;DR</span>${spacer}${text}</p></aside>`;
  });
}

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, "");
}

function stringValue(value?: string | string[]): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function normalizeTags(value?: string | string[]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugToTitle(slug: string): string {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function createSummary(content: string): string {
  const plain = content.replace(/[#>*`]/g, "").trim();
  const firstParagraph = plain.split(/\n\n+/)[0] ?? "";
  return firstParagraph.slice(0, 160);
}

function countWords(content: string): number {
  return content.split(/\s+/).filter(Boolean).length;
}

function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 220));
}

function toTimestamp(date: string): number {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}
