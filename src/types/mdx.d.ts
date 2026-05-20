// Ambient type for MDX modules. `@types/mdx` already declares the default
// export; this adds the `frontmatter` named export injected by
// `remark-mdx-frontmatter`.
declare module "*.mdx" {
  export const frontmatter: Record<string, unknown>;
}
