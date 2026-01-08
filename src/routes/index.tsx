import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, MotionConfig } from 'framer-motion'
import { ArrowUpRight, Github, Linkedin, Mail, X } from 'lucide-react'

import { getAllPosts, type PostMeta } from '../lib/posts'
import { SITE } from '../lib/site'

export const Route = createFileRoute('/')({ component: Home })

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
}

const focusAreas = ['observability', 'ml systems', 'infra', 'tooling']

const socialIcons: Record<
  string,
  (props: { className?: string }) => JSX.Element
> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  X,
  Email: Mail,
}

function Home() {
  const posts = getAllPosts()

  return (
    <MotionConfig transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
      <main className="min-h-screen px-6 pb-20 pt-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-12">
          <header className="paper-card relative overflow-hidden px-6 py-10 md:px-12">
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-emerald-50/60" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="signal">
                  <span className="signal-dot" />
                  field notes
                </span>
                <span className="tech-pill">kayvane.com</span>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                    {SITE.name}
                  </h1>
                  <p className="mt-3 text-lg text-[color:var(--ink-muted)]">
                    {SITE.intro}
                  </p>
                </div>
                <div className="flex flex-col gap-4 text-sm">
                  <a
                    className="group link-arrow"
                    href={SITE.githubRepo}
                    target="_blank"
                    rel="noreferrer"
                  >
                    blog repo
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {SITE.socials.map((social) => {
                      const Icon = socialIcons[social.label] ?? ArrowUpRight
                      return (
                        <a
                          key={social.label}
                          className="group flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-muted)] transition hover:border-emerald-500/40 hover:text-[color:var(--ink)]"
                          href={social.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {social.label}
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <span key={area} className="tech-pill">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                  latest posts
                </p>
                <h2 className="text-2xl font-semibold">Writing</h2>
              </div>
              <div className="signal">
                <span className="signal-dot" />
                {posts.length} entries
              </div>
            </div>
            <motion.div
              className="mt-6 grid gap-6 md:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {posts.length === 0 ? (
                <div className="paper-card px-6 py-8 text-[color:var(--ink-muted)]">
                  First note coming soon.
                </div>
              ) : null}
              {posts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </motion.div>
          </section>

          <footer className="flex flex-col gap-2 text-sm text-[color:var(--ink-muted)]">
            <p className="font-mono text-xs uppercase tracking-[0.2em]">
              tuned for clarity and small surprises
            </p>
            <p>{SITE.description}</p>
          </footer>
        </div>
      </main>
    </MotionConfig>
  )
}

function PostCard({ post }: { post: PostMeta }) {
  return (
    <motion.article
      variants={itemVariants}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.99 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_18px_50px_-40px_rgba(15,118,110,0.4)] transition"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-emerald-50/70 opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
          <span className="font-mono">{formatDate(post.date)}</span>
          <span className="font-mono">{post.readingTime}</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[color:var(--ink)]">
            {post.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-muted)]">
            {post.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="tech-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
          <Link
            className="link-arrow text-[color:var(--ink)]"
            to="/posts/$slug"
            params={{ slug: post.slug }}
          >
            read
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <div className="flex items-center gap-3 font-mono">
            {post.github ? (
              <a
                className="hover:text-[color:var(--ink)]"
                href={post.github}
                target="_blank"
                rel="noreferrer"
              >
                github
              </a>
            ) : null}
            {post.script ? (
              <a
                className="hover:text-[color:var(--ink)]"
                href={post.script}
                target="_blank"
                rel="noreferrer"
              >
                script
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function formatDate(value: string): string {
  if (!value) return 'draft'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}
