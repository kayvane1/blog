import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://kayvane.com";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const postsDir = path.join(__dirname, "..", "src", "content", "posts");
const outputPath = path.join(__dirname, "..", "public", "sitemap.xml");

const markdownFiles = (await fs.readdir(postsDir))
  .filter((file) => file.endsWith(".md"))
  .sort();

const posts = await Promise.all(
  markdownFiles.map(async (file) => {
    const slug = file.replace(/\.md$/, "");
    const filePath = path.join(postsDir, file);
    const raw = await fs.readFile(filePath, "utf8");
    const frontmatter = parseFrontmatter(raw);
    const frontmatterDate = typeof frontmatter.date === "string" ? frontmatter.date : undefined;
    const date = toDate(frontmatterDate);
    const stats = await fs.stat(filePath);
    const lastmodDate = date ?? stats.mtime;

    return {
      slug,
      lastmod: formatDate(lastmodDate),
      lastmodDate,
    };
  }),
);

const latestPostDate = posts.reduce((latest, post) => {
  if (!latest) return post.lastmodDate;
  return post.lastmodDate > latest ? post.lastmodDate : latest;
}, undefined);

const entries = [
  {
    loc: SITE_URL,
    lastmod: latestPostDate ? formatDate(latestPostDate) : undefined,
    changefreq: "weekly",
    priority: "1.0",
  },
  ...posts.map((post) => ({
    loc: `${SITE_URL}/posts/${post.slug}`,
    lastmod: post.lastmod,
    changefreq: "monthly",
    priority: "0.7",
  })),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map((entry) => renderUrlEntry(entry)),
  "</urlset>",
  "",
].join("\n");

await fs.writeFile(outputPath, xml, "utf8");
console.log(`sitemap written: ${outputPath}`);

function renderUrlEntry({ loc, lastmod, changefreq, priority }) {
  const lines = ["  <url>", `    <loc>${loc}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  lines.push("  </url>");
  return lines.join("\n");
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) continue;
    const value = rest.join(":").trim();
    data[key.trim()] = stripQuotes(value);
  }
  return data;
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

function toDate(value) {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
