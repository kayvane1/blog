import { useCallback, useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { TagPill } from "../components/TagPill";
import { getChapter } from "../lib/chapters";
import { getAllPosts, type PostMeta } from "../lib/posts";
import { SITE, absoluteUrl } from "../lib/site";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "Kayvane | ML Notes";
    const description = SITE.description;
    const canonical = absoluteUrl();
    const personId = `${SITE.url}/#person`;
    const websiteId = `${SITE.url}/#website`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": personId,
          name: SITE.name,
          url: SITE.url,
          sameAs: SITE.socials
            .map((social) => social.href)
            .filter((href) => !href.startsWith("mailto:")),
        },
        {
          "@type": "WebSite",
          "@id": websiteId,
          url: SITE.url,
          name: SITE.name,
          description,
          publisher: {
            "@id": personId,
          },
          inLanguage: SITE.language,
        },
      ],
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: canonical }],
      headScripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  component: Home,
});

/**
 * The deck: one full-viewport chapter per post. Each chapter pins for
 * WRAPPER_VH − 100vh of scroll; the last 100vh of that is the next chapter
 * sliding over (wrappers overlap via −100vh bottom margin, z-index
 * ascending). The hero schematic is NOT scroll-scrubbed: it autoplays as a
 * PLAY_SECONDS timeline once the panel is half in view, holds its end state
 * while covered, and rewinds when it leaves the viewport so a return visit
 * replays it.
 */
const WRAPPER_VH = 280;
const PLAY_SECONDS = 5;
/** Wrapper progress at which the next chapter starts covering this one. */
const EXIT_START = 1 - 100 / (WRAPPER_VH - 100);

function Home() {
  const posts = getAllPosts();
  const reduced = useReducedMotion() ?? false;
  // −1 = intro; 0..n−1 = chapters
  const [activeIndex, setActiveIndex] = useState(-1);
  const onActive = useCallback((index: number) => setActiveIndex(index), []);

  // Overscroll / scrollbar gutter should be ink on the deck, not reader-white.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.backgroundColor;
    root.style.backgroundColor = "var(--ink)";
    return () => {
      root.style.backgroundColor = prev;
    };
  }, []);

  return (
    <main id="top" className="bg-[color:var(--ink)] text-[color:var(--ghost)]">
      <DeckHeader />
      <ChapterRail posts={posts} activeIndex={activeIndex} reduced={reduced} />

      <IntroPanel
        postCount={posts.length}
        reduced={reduced}
        active={activeIndex === -1}
        onActive={onActive}
      />

      {posts.map((post, index) => (
        <ChapterSection
          key={post.slug}
          post={post}
          index={index}
          total={posts.length}
          reduced={reduced}
          onActive={onActive}
        />
      ))}

      <OutroPanel posts={posts} zIndex={posts.length + 2} onActive={onActive} />
    </main>
  );
}

function DeckHeader() {
  return (
    <header
      className="fixed inset-x-0 top-0 flex items-center justify-between px-4 py-2 sm:items-baseline sm:px-6 sm:py-5 md:px-14"
      style={{ zIndex: "var(--z-chrome)" }}
    >
      <a
        href="#top"
        className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold tracking-tight"
      >
        Kayvane Shakerifar
      </a>
      <nav aria-label="Social links" className="hidden items-baseline gap-4 sm:flex md:gap-6">
        {SITE.socials.map((social) => (
          <a
            key={social.label}
            className="meta-label inline-flex min-h-11 items-center opacity-65 transition-opacity hover:opacity-100"
            href={social.href}
            target="_blank"
            rel="noreferrer"
          >
            {social.label}
          </a>
        ))}
      </nav>
      <details className="relative sm:hidden">
        <summary className="meta-label flex min-h-11 cursor-pointer list-none items-center px-2 opacity-70 [&::-webkit-details-marker]:hidden">
          links
        </summary>
        <nav
          aria-label="Social links"
          className="absolute right-0 top-full flex w-40 flex-col border bg-[color:var(--ink)] p-1 shadow-2xl"
          style={{ borderColor: "color-mix(in oklab, var(--ghost) 18%, transparent)" }}
        >
          {SITE.socials.map((social) => (
            <a
              key={social.label}
              className="meta-label flex min-h-11 items-center justify-end px-3 opacity-75 transition-opacity hover:opacity-100"
              href={social.href}
              target="_blank"
              rel="noreferrer"
            >
              {social.label}
            </a>
          ))}
        </nav>
      </details>
    </header>
  );
}

function ChapterRail({
  posts,
  activeIndex,
  reduced,
}: {
  posts: PostMeta[];
  activeIndex: number;
  reduced: boolean;
}) {
  // Past the deck (outro in view) the rail has nothing to point at — fade it.
  const pastDeck = activeIndex >= posts.length;
  return (
    <nav
      aria-label="Chapters"
      className={`fixed right-8 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3.5 transition-opacity duration-500 lg:flex ${pastDeck ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ zIndex: "var(--z-chrome)" }}
    >
      {posts.map((post, i) => {
        const { accent } = getChapter(post.slug);
        const active = i === activeIndex;
        return (
          <a
            key={post.slug}
            href={`#ch-${post.slug}`}
            title={post.title}
            aria-label={`Chapter ${i + 1}: ${post.title}`}
            aria-current={active ? "true" : undefined}
            className="group flex items-center gap-2.5"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById(`ch-${post.slug}`)?.scrollIntoView({
                behavior: reduced ? "auto" : "smooth",
              });
            }}
          >
            <span
              className="meta-label transition-opacity duration-300"
              style={{
                color: active ? accent : "var(--ghost)",
                opacity: active ? 1 : 0.4,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className="h-px transition-all duration-300 group-hover:opacity-90"
              style={{
                width: active ? 30 : 14,
                backgroundColor: active ? accent : "var(--ghost)",
                opacity: active ? 1 : 0.35,
              }}
            />
          </a>
        );
      })}
    </nav>
  );
}

function IntroPanel({
  postCount,
  reduced,
  active,
  onActive,
}: {
  postCount: number;
  reduced: boolean;
  active: boolean;
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: reduced ? ["start end", "end start"] : ["start start", "end end"],
  });
  const dim = useTransform(scrollYProgress, [0, 1], [1, 0.3]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduced ? v > 0.35 && v < 0.65 : v > 0.001 && v < 0.999) onActive(-1);
  });

  return (
    <section
      ref={ref}
      aria-label="Introduction"
      className="relative"
      style={reduced ? { zIndex: 1 } : { height: "200vh", marginBottom: "-100vh", zIndex: 1 }}
    >
      <motion.div
        className={
          reduced
            ? "relative flex min-h-dvh flex-col justify-center overflow-hidden"
            : "sticky top-0 flex h-dvh flex-col justify-center overflow-hidden"
        }
        style={{
          backgroundColor: "var(--ink)",
          ...(reduced ? {} : { opacity: dim, scale }),
        }}
      >
        {/* schematic dot field */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(color-mix(in oklab, var(--ghost) 15%, transparent) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(820px circle at 32% 44%, black, transparent 72%)",
          }}
        />

        <div className="relative px-6 md:px-14">
          <h1 className="display" style={{ fontSize: "clamp(2.9rem, 1.4rem + 6.5vw, 6rem)" }}>
            Kayvane
            <br />
            Shakerifar
          </h1>
          <p
            className="mt-6 max-w-[46ch] text-base leading-relaxed md:text-lg"
            style={{ color: "color-mix(in oklab, var(--ghost) 75%, transparent)" }}
          >
            {SITE.description}
          </p>
          <p className="meta-label mt-10 opacity-65">
            {postCount} articles · each preview is the system, running
          </p>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
          <span className="meta-label opacity-65">scroll</span>
          <div
            className="h-12 w-px overflow-hidden"
            style={{ backgroundColor: "color-mix(in oklab, var(--ghost) 20%, transparent)" }}
          >
            <motion.div
              className="h-full w-full"
              style={{ backgroundColor: "var(--ghost)" }}
              animate={active && !reduced ? { y: ["-100%", "100%"] } : { y: "-30%" }}
              transition={{ duration: 2.1, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function ChapterSection({
  post,
  index,
  total,
  reduced,
  onActive,
}: {
  post: PostMeta;
  index: number;
  total: number;
  reduced: boolean;
  onActive: (index: number) => void;
}) {
  const { accent, Hero } = getChapter(post.slug);
  const ref = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: reduced ? ["start end", "end start"] : ["start start", "end end"],
  });
  const exitScale = useTransform(scrollYProgress, [EXIT_START, 1], [1, 0.94]);
  const exitDim = useTransform(scrollYProgress, [EXIT_START, 1], [1, 0.45]);
  const exitRadius = useTransform(scrollYProgress, [EXIT_START, 1], [0, 28]);

  // Autoplay: run the hero's timeline once the panel is half in view. A
  // covered panel still intersects the viewport, so it holds its end state;
  // only scrolling far enough for the panel to leave the screen rewinds it.
  const playback = useMotionValue(reduced ? 1 : 0);
  const playing = useInView(panelRef, { amount: 0.5 }) && !reduced;
  useEffect(() => {
    if (reduced) return;
    if (!playing) {
      playback.set(0);
      return;
    }
    const controls = animate(playback, 1, { duration: PLAY_SECONDS, ease: "linear" });
    return () => controls.stop();
  }, [playing, reduced, playback]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduced ? v > 0.35 && v < 0.65 : v > 0.001 && v < 0.999) onActive(index);
  });

  const titleId = `ch-title-${post.slug}`;

  return (
    <section
      ref={ref}
      id={`ch-${post.slug}`}
      aria-labelledby={titleId}
      className="relative"
      style={
        reduced
          ? { zIndex: index + 2 }
          : { height: `${WRAPPER_VH}vh`, marginBottom: "-100vh", zIndex: index + 2 }
      }
    >
      <motion.div
        ref={panelRef}
        className={
          reduced
            ? "relative flex min-h-dvh flex-col overflow-hidden md:block"
            : "sticky top-0 flex h-dvh flex-col overflow-hidden md:block"
        }
        style={{
          backgroundColor: "var(--ink)",
          ...(reduced ? {} : { scale: exitScale, opacity: exitDim, borderRadius: exitRadius }),
        }}
      >
        {/* accent field */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(1100px circle at 72% 36%, color-mix(in oklab, ${accent} 9%, transparent), transparent 66%)`,
          }}
        />
        {/* grounds the fixed header over the scene */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[color:var(--ink)] to-transparent"
          style={{ zIndex: 2 }}
        />

        {/* chapter meta */}
        <div className="chapter-meta relative flex items-baseline justify-between px-6 pt-16 md:absolute md:inset-x-0 md:top-0 md:px-14 md:pt-20">
          <span className="meta-label" style={{ color: accent }}>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="meta-label opacity-65">
            {formatDate(post.date)} · {post.readingTime}
          </span>
        </div>

        {/* the system, running. Mobile: a flex row that takes every pixel the
            text below doesn't need — no masks, nothing cropped. Desktop: an
            absolute column disjoint from the text column, so no title length
            or viewport size can collide with the scene. */}
        <div className="chapter-scene pointer-events-none relative min-h-0 flex-1 px-3 py-4 md:absolute md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[50%] md:p-0 xl:w-[54%] lg:pr-24">
          <Hero progress={playback} active={playing} accent={accent} reduced={reduced} />
        </div>

        {/* chapter content */}
        <div className="chapter-copy relative px-6 pb-14 md:absolute md:inset-x-0 md:bottom-0 md:max-w-[48%] xl:max-w-[44%] md:px-14 md:pb-20">
          <h2
            id={titleId}
            className="chapter-title display break-words"
            style={{ fontSize: "clamp(1.85rem, 0.7rem + 3.3vw, 3.9rem)" }}
          >
            <Link
              to="/posts/$slug"
              params={{ slug: post.slug }}
              className="focus-visible:outline-2 focus-visible:outline-offset-8"
              style={{ outlineColor: accent }}
            >
              {post.title}
              {/* stretched link: the whole panel opens the post */}
              <span className="absolute inset-0" aria-hidden />
            </Link>
          </h2>
          <p
            className="mt-5 max-w-[52ch] text-[15px] leading-relaxed md:text-base"
            style={{
              color: "color-mix(in oklab, var(--ghost) 72%, transparent)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.summary}
          </p>
          <div className="chapter-tags mt-6 flex flex-wrap gap-2" style={{ color: accent }}>
            {post.tags.map((tag) => (
              <TagPill key={tag}>{tag}</TagPill>
            ))}
          </div>
          <div className="chapter-action link-arrow mt-8" style={{ color: accent }}>
            read the post
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        {/* playback progress */}
        {reduced ? null : (
          <motion.div
            aria-hidden
            className="absolute bottom-0 left-0 h-0.5 w-full origin-left"
            style={{ backgroundColor: accent, scaleX: playback, opacity: 0.85 }}
          />
        )}
      </motion.div>
    </section>
  );
}

function OutroPanel({
  posts,
  zIndex,
  onActive,
}: {
  posts: PostMeta[];
  zIndex: number;
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.6", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // Claim the active slot while the outro is in view (hides the rail);
    // hand it back to the last chapter when scrolling back up.
    onActive(v > 0.001 ? posts.length : posts.length - 1);
  });

  return (
    <section
      ref={ref}
      aria-label="Index and contact"
      className="relative flex min-h-dvh flex-col justify-between gap-16 px-6 pb-10 pt-28 md:px-14"
      style={{ zIndex, backgroundColor: "var(--ink)" }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <h2 className="display" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.4rem)" }}>
            Elsewhere
          </h2>
          <ul className="mt-5 flex flex-col">
            {SITE.socials.map((social) => (
              <li key={social.label}>
                <a
                  className="link-arrow min-h-11 opacity-75 transition-opacity hover:opacity-100"
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
            <li>
              <a
                className="link-arrow min-h-11 opacity-75 transition-opacity hover:opacity-100"
                href={SITE.githubRepo}
                target="_blank"
                rel="noreferrer"
              >
                blog source
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </li>
          </ul>
        </div>

        <div className="min-w-0">
          <h2 className="meta-label opacity-65">Index</h2>
          <ol
            className="mt-6 flex flex-col border-b"
            style={{ borderColor: "color-mix(in oklab, var(--ghost) 14%, transparent)" }}
          >
            {posts.map((post, i) => {
              const { accent } = getChapter(post.slug);
              return (
                <li key={post.slug}>
                  <Link
                    to="/posts/$slug"
                    params={{ slug: post.slug }}
                    className="group flex items-baseline gap-4 border-t py-3.5 transition-colors"
                    style={{ borderColor: "color-mix(in oklab, var(--ghost) 14%, transparent)" }}
                  >
                    <span className="meta-label w-7 shrink-0 opacity-45">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-[15px] font-medium transition-colors group-hover:[color:var(--row-accent)]"
                      style={{ "--row-accent": accent } as React.CSSProperties}
                    >
                      {post.title}
                    </span>
                    <span className="meta-label hidden shrink-0 opacity-45 sm:inline">
                      {formatDate(post.date)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <p className="meta-label max-w-[72ch] leading-relaxed opacity-45">
        © 2026 Kayvane Shakerifar · every article is a system; each preview is that system running ·
        built with TanStack Start &amp; Motion · set in Archivo &amp; Fragment Mono
      </p>
    </section>
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
