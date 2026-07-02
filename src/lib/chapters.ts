import type { ComponentType } from "react";

import { AgentLoopHero } from "../components/heroes/AgentLoopHero";
import { DiceRollHero } from "../components/heroes/DiceRollHero";
import { EventFlowHero } from "../components/heroes/EventFlowHero";
import { FsmHero } from "../components/heroes/FsmHero";
import { GenericSystemHero } from "../components/heroes/GenericSystemHero";
import { PagedKvHero } from "../components/heroes/PagedKvHero";
import { SingleflightHero } from "../components/heroes/SingleflightHero";
import { TldrHero } from "../components/heroes/TldrHero";
import { TraceWaterfallHero } from "../components/heroes/TraceWaterfallHero";
import type { HeroProps } from "../components/heroes/types";

/**
 * Per-post art direction for the homepage deck: the chapter's accent color
 * and its hero — the living schematic of the system the post describes.
 *
 * New posts without an entry fall back to a neutral accent and the generic
 * pipeline scene; add a bespoke entry when the post ships.
 */

export type Chapter = {
  accent: string;
  Hero: ComponentType<HeroProps>;
};

const CHAPTERS: Record<string, Chapter> = {
  "multi-level-caching-on-modal": {
    accent: "oklch(0.85 0.13 210)",
    Hero: SingleflightHero,
  },
  "event-driven-evolutionary-software": {
    accent: "oklch(0.87 0.19 140)",
    Hero: EventFlowHero,
  },
  "on-building-with-agents": {
    accent: "oklch(0.78 0.15 55)",
    Hero: AgentLoopHero,
  },
  "llm-tldr-claude-hooks-tutorial": {
    accent: "oklch(0.89 0.15 95)",
    Hero: TldrHero,
  },
  "how-vllm-works": {
    accent: "oklch(0.76 0.14 300)",
    Hero: PagedKvHero,
  },
  "datadog-apm-modal-integration": {
    accent: "oklch(0.75 0.16 350)",
    Hero: TraceWaterfallHero,
  },
  "building-a-mini-game-with-gpt-5-2-codex-suno-gpt-image-gen": {
    accent: "oklch(0.7 0.18 25)",
    Hero: DiceRollHero,
  },
  "guided-generation-with-outlines": {
    accent: "oklch(0.76 0.11 250)",
    Hero: FsmHero,
  },
};

const FALLBACK: Chapter = {
  accent: "oklch(0.9 0.02 265)",
  Hero: GenericSystemHero,
};

export const getChapter = (slug: string): Chapter => CHAPTERS[slug] ?? FALLBACK;
