export const SITE = {
  name: "Kayvane",
  url: "https://kayvane.com",
  language: "en",
  description: "Machine learning engineer writing about systems, ML infrastructure, and new tools.",
  intro:
    "Notes from shipping ML systems, debugging pipelines, and stress-testing ideas in production.",
  githubRepo: "https://github.com/kayvane1/blog",
  socials: [
    { label: "GitHub", href: "https://github.com/kayvane1" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/kayvane" },
    { label: "X", href: "https://x.com/kayvane" },
    { label: "Email", href: "mailto:kayvane.shakerifar@gmail.com" },
  ],
};

export const absoluteUrl = (path = "/") => {
  const base = SITE.url.replace(/\/+$/, "");
  if (!path || path === "/") return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
};
