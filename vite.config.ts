import { defineConfig, type Plugin } from "vite";
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

/**
 * The MDX plugin runs with `enforce: "pre"`, which also catches
 * `index.mdx?raw` imports (used by src/lib/posts.ts for word counts) and
 * compiles them to components instead of leaving Vite to return the source
 * string. Skip any id with a query so `?raw` stays raw.
 */
function mdxSkippingRawImports(): Plugin {
  const plugin = mdx({
    remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: "frontmatter" }], remarkGfm],
  }) as Plugin;
  const mdxTransform = plugin.transform as (this: unknown, code: string, id: string) => unknown;
  return {
    ...plugin,
    enforce: "pre",
    transform(this: unknown, code: string, id: string) {
      if (id.includes("?")) return null;
      return mdxTransform.call(this, code, id);
    },
  } as Plugin;
}

const config = defineConfig({
  plugins: [
    // Devtools binds a fixed event-bus port (42069), which collides when two
    // checkouts run dev servers at once. Set NO_DEVTOOLS=1 to skip it.
    ...(process.env.NO_DEVTOOLS ? [] : [devtools()]),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    // MDX must run before viteReact so its JSX output gets transformed.
    mdxSkippingRawImports(),
    tanstackStart({
      router: {
        enableRouteTreeFormatting: false,
      },
    }),
    viteReact({ include: /\.(jsx|tsx|mdx)$/ }),
  ],
});

export default config;
