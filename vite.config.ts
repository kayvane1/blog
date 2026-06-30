import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";

const POST_RAW_VIRTUAL = "virtual:post-raw-sources";
const postsDir = path.resolve(__dirname, "src/content/posts");

function rawPostSources() {
  const slugs = fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const out: Record<string, string> = {};
  for (const slug of slugs) {
    const file = path.join(postsDir, slug, "index.mdx");
    if (fs.existsSync(file)) out[slug] = fs.readFileSync(file, "utf-8");
  }
  return out;
}

const rawPostsPlugin = {
  name: "raw-post-sources",
  resolveId(id: string) {
    if (id === POST_RAW_VIRTUAL) return id;
    return null;
  },
  load(id: string) {
    if (id !== POST_RAW_VIRTUAL) return null;
    return `export default ${JSON.stringify(rawPostSources())};`;
  },
  handleHotUpdate({
    file,
    server,
  }: {
    file: string;
    server: {
      moduleGraph: { getModuleById: (id: string) => unknown };
      reloadModule: (m: unknown) => void;
    };
  }) {
    if (file.endsWith(".mdx") && file.startsWith(postsDir)) {
      const mod = server.moduleGraph.getModuleById(POST_RAW_VIRTUAL);
      if (mod) server.reloadModule(mod);
    }
  },
};

const config = defineConfig({
  plugins: [
    rawPostsPlugin,
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    // MDX must run before viteReact so its JSX output gets transformed.
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [
          remarkFrontmatter,
          [remarkMdxFrontmatter, { name: "frontmatter" }],
          remarkGfm,
        ],
      }),
    },
    tanstackStart({
      router: {
        enableRouteTreeFormatting: false,
      },
    }),
    viteReact({ include: /\.(jsx|tsx|mdx)$/ }),
  ],
});

export default config;
