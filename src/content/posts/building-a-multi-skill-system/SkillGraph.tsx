import { ArrowRight, Box, ChevronDown, Layers, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

type NodeKind = "playbook" | "skill" | "principle" | "orchestrator";

type Selection = { kind: NodeKind; id: string };

type PlaybookStep = {
  n: number;
  title: string;
  summary: string;
  skills: string[];
  principles: string[];
};

type Playbook = {
  id: string;
  title: string;
  purpose: string;
  steps: PlaybookStep[];
  chainsToOpeningPR: boolean;
};

type WorkflowSkill = {
  id: string;
  title: string;
  summary: string;
  principles: string[];
  external?: boolean;
  /** Surfaces that aren't real workflow skills but show up in step chips (control surfaces, models). */
  surface?: "subagent" | "external" | "control";
};

type PrincipleGroup = "core" | "architecture" | "verification" | "delegation" | "meta";

type Principle = {
  id: string;
  group: PrincipleGroup;
  title: string;
  summary: string;
};

const ORCHESTRATOR: Selection = { kind: "orchestrator", id: "poteto-mode" };

const PLAYBOOKS: Playbook[] = [
  {
    id: "investigation",
    title: "investigation",
    purpose: "A read-only question. how does X work, why was Y built this way, are we sure.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "route to how or why",
        summary: "Pick the right skill: how for narrow questions, why for motivation.",
        skills: ["how", "why"],
        principles: [],
      },
      {
        n: 2,
        title: "throughput checkpoint",
        summary: "Write one-line checkpoint: read-only, n/a.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "produce the answer",
        summary: "Return how-shaped output or a recommendation. No code change.",
        skills: [],
        principles: [],
      },
      {
        n: 4,
        title: "unslop the reply",
        summary: "Strip AI tells from the prose surface.",
        skills: ["unslop"],
        principles: [],
      },
    ],
  },
  {
    id: "bug-fix",
    title: "bug fix",
    purpose: "Reproduce a defect, root-cause it, fix with runtime evidence.",
    chainsToOpeningPR: true,
    steps: [
      {
        n: 1,
        title: "reproduce on the surface",
        summary: "Drive the failing surface via the matching control skill. Don't hand the repro to the user.",
        skills: ["control"],
        principles: ["prove-it-works"],
      },
      {
        n: 2,
        title: "binary-search the cause",
        summary: "Hypothesise, rule out with runtime evidence, narrow to one mechanism.",
        skills: ["how", "why"],
        principles: ["fix-root-causes"],
      },
      {
        n: 3,
        title: "plan the fix",
        summary: "If it crosses a function boundary, architect first. Delegate the diff.",
        skills: ["architect", "composer-2.5-fast"],
        principles: [],
      },
      {
        n: 4,
        title: "verify on the same surface",
        summary: "Original repro now passes. Inconclusive or wrong-surface is not a pass.",
        skills: ["control"],
        principles: ["prove-it-works"],
      },
      {
        n: 5,
        title: "stage commits, failing test first",
        summary: "Land the repro before the fix. TDD when the bug has a cheap local test path.",
        skills: ["tdd"],
        principles: [],
      },
    ],
  },
  {
    id: "perf-issue",
    title: "perf issue",
    purpose: "Trace a measured slowness and improve it against a baseline.",
    chainsToOpeningPR: true,
    steps: [
      {
        n: 1,
        title: "capture baseline trace",
        summary: "Trace via the matching control skill before changing anything.",
        skills: ["control"],
        principles: [],
      },
      {
        n: 2,
        title: "ground hypotheses",
        summary: "Run how over the affected subsystem before claiming perf ceilings.",
        skills: ["how"],
        principles: [],
      },
      {
        n: 3,
        title: "plan and implement",
        summary: "Architect if crossing a boundary. Delegate the diff. Capture post-fix trace.",
        skills: ["architect", "composer-2.5-fast"],
        principles: [],
      },
      {
        n: 4,
        title: "compare traces",
        summary: "Convert artifacts to a queryable shape. Inconclusive is a fail.",
        skills: [],
        principles: [],
      },
      {
        n: 5,
        title: "cite the delta",
        summary: "PR body references the measurement, not a vibe.",
        skills: [],
        principles: ["prove-it-works"],
      },
    ],
  },
  {
    id: "runtime-forensics",
    title: "runtime forensics",
    purpose: "Diagnose a live runtime symptom from instrumentation. Deliverable: diagnosis, not fix.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "capture live signal",
        summary: "CPU profile, heap snapshot, or CDP trace via the matching control skill.",
        skills: ["control"],
        principles: [],
      },
      {
        n: 2,
        title: "reduce to smoking gun",
        summary: "Parse the large artifact in a subagent. Keep the reduced finding in the main thread.",
        skills: [],
        principles: ["guard-the-context-window"],
      },
      {
        n: 3,
        title: "prove the mechanism",
        summary: "Inject instrumentation or a hotfix probe to confirm cheaply.",
        skills: [],
        principles: [],
      },
      {
        n: 4,
        title: "map to source",
        summary: "Tie the finding to a file, symbol, and line.",
        skills: [],
        principles: [],
      },
      {
        n: 5,
        title: "checkpoint as forensics",
        summary: "Throughput checkpoint: read-only forensics, n/a.",
        skills: [],
        principles: [],
      },
    ],
  },
  {
    id: "trace-forensics",
    title: "trace forensics",
    purpose: "Diagnose a captured profiling artifact: cpuprofile, trace, spindump, heap snapshot.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "load the artifact",
        summary: "Pick the parser. Parse large files in a subagent.",
        skills: [],
        principles: ["guard-the-context-window"],
      },
      {
        n: 2,
        title: "transform to queryable",
        summary: "One row per sample in sqlite. Enable aggregation.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "narrow to the cause",
        summary: "Query hot frames, walk the call tree. For leaks, follow the retainer chain.",
        skills: [],
        principles: [],
      },
      {
        n: 4,
        title: "attribute to source",
        summary: "Map the hot frame to file, symbol, line via artifact symbols.",
        skills: [],
        principles: [],
      },
      {
        n: 5,
        title: "confirm with paired capture",
        summary: "Diff before and after artifacts. Without a pair, mark as strongest hypothesis.",
        skills: [],
        principles: [],
      },
      {
        n: 6,
        title: "hand back the diagnosis",
        summary: "Cited finding. No fix unless asked. Throughput checkpoint: n/a.",
        skills: [],
        principles: [],
      },
    ],
  },
  {
    id: "feature",
    title: "feature",
    purpose: "New or changed behavior, built from a named data shape.",
    chainsToOpeningPR: true,
    steps: [
      {
        n: 1,
        title: "how over the subsystem",
        summary: "Understand the surface area before designing the feature.",
        skills: ["how"],
        principles: [],
      },
      {
        n: 2,
        title: "architect the design",
        summary: "Parallel design exploration. Skip with a stated reason if you can.",
        skills: ["architect"],
        principles: [],
      },
      {
        n: 3,
        title: "throughput checkpoint",
        summary: "Name blocking steps, independent workstreams, shared state, decomposition.",
        skills: [],
        principles: ["separate-before-serializing-shared-state", "laziness-protocol"],
      },
      {
        n: 4,
        title: "delegate implementation",
        summary: "Composer subagent with file scope and success criteria. You review the diff.",
        skills: ["composer-2.5-fast"],
        principles: [],
      },
      {
        n: 5,
        title: "verify on matching surface",
        summary: "Test via control skill. Inconclusive or wrong-surface is not a pass.",
        skills: ["control"],
        principles: ["prove-it-works"],
      },
      {
        n: 6,
        title: "rebase into small commits",
        summary: "Order commits to tell the story. Stack follow-ups.",
        skills: [],
        principles: [],
      },
      {
        n: 7,
        title: "interrogate if contested",
        summary: "Four-model adversarial review before shipping a disputed design.",
        skills: ["interrogate"],
        principles: [],
      },
    ],
  },
  {
    id: "refactoring",
    title: "refactoring",
    purpose: "A behavior-preserving change to structure or shape.",
    chainsToOpeningPR: true,
    steps: [
      {
        n: 1,
        title: "pin the behavior contract",
        summary: "Run how to learn the contract. Write a characterization test before touching structure.",
        skills: ["how"],
        principles: ["prove-it-works", "foundational-thinking"],
      },
      {
        n: 2,
        title: "name the target shape",
        summary: "State the module layout and types. Architect if crossing a boundary.",
        skills: ["architect"],
        principles: ["foundational-thinking", "redesign-from-first-principles"],
      },
      {
        n: 3,
        title: "subtract before adding",
        summary: "Delete dead weight and collapse wrappers before introducing the new shape.",
        skills: [],
        principles: ["subtract-before-you-add", "laziness-protocol"],
      },
      {
        n: 4,
        title: "move in small steps",
        summary: "Each step keeps the pin green. Migrate every caller then delete the old API in one wave.",
        skills: ["composer-2.5-fast"],
        principles: ["migrate-callers-then-delete-legacy-apis"],
      },
      {
        n: 5,
        title: "prove behavior unchanged",
        summary: "Verify on the real artifact. For large reshapes, run an equivalence check.",
        skills: ["control"],
        principles: ["prove-it-works"],
      },
      {
        n: 6,
        title: "confirm reduced reader load",
        summary: "The refactor only earns its place if reader load drops. Revert if it doesn't.",
        skills: [],
        principles: ["minimize-reader-load"],
      },
    ],
  },
  {
    id: "prototype",
    title: "prototype",
    purpose: "Throwaway sketch to make a design decision cheaply.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "scope the decision",
        summary: "Name which layout, interaction, or density the prototype tests. No decision means no prototype.",
        skills: [],
        principles: [],
      },
      {
        n: 2,
        title: "gather references",
        summary: "Search prior art. Build a moodboard when the design space is open.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "build throwaway",
        summary: "Vanilla HTML/CSS/JS in a scratch dir. No framework, no tests, no abstractions.",
        skills: [],
        principles: ["laziness-protocol"],
      },
      {
        n: 4,
        title: "compare variants",
        summary: "Build 2-3 alternatives behind a switcher. Label each.",
        skills: [],
        principles: ["exhaust-the-design-space"],
      },
      {
        n: 5,
        title: "verify visually",
        summary: "Screenshot and interact on the matching surface.",
        skills: ["control"],
        principles: [],
      },
      {
        n: 6,
        title: "present alternatives",
        summary: "Variants, tradeoffs, recommendation, scratch path. Hand to Feature if you decide to build.",
        skills: [],
        principles: [],
      },
    ],
  },
  {
    id: "visual-parity",
    title: "visual parity",
    purpose: "Pixel-exact UI equivalence between two implementations.",
    chainsToOpeningPR: true,
    steps: [
      {
        n: 1,
        title: "establish baseline",
        summary: "Screenshot the current component across states before migration.",
        skills: [],
        principles: [],
      },
      {
        n: 2,
        title: "state the anti-shortcut clauses",
        summary: "No harness mods, no baseline tampering, no restructuring to pass the test.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "migrate one at a time",
        summary: "Parallelize across worktrees with one owner per component.",
        skills: [],
        principles: ["separate-before-serializing-shared-state"],
      },
      {
        n: 4,
        title: "verify via image diff",
        summary: "Check each component against the baseline. Nonzero diff is a fail. Loop until zero.",
        skills: ["control"],
        principles: ["prove-it-works"],
      },
    ],
  },
  {
    id: "authoring-a-skill",
    title: "authoring a skill",
    purpose: "Writing or editing a SKILL.md.",
    chainsToOpeningPR: true,
    steps: [
      {
        n: 1,
        title: "use create-skill",
        summary: "Cursor's built-in for authoring SKILL.md files.",
        skills: ["create-skill"],
        principles: [],
      },
      {
        n: 2,
        title: "validate frontmatter and links",
        summary: "Check the metadata, referenced files, and cross-skill links.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "test if structural",
        summary: "Write test cases for structural skills. Skip for subjective ones.",
        skills: [],
        principles: ["encode-lessons-in-structure"],
      },
    ],
  },
  {
    id: "eval",
    title: "eval",
    purpose: "Test how a skill or prompt change affects agent behavior, blinded.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "frame the test",
        summary: "State variant and success criteria. Write the rubric for the judge only.",
        skills: [],
        principles: [],
      },
      {
        n: 2,
        title: "sanitize environments",
        summary: "Per-candidate dir with the variant in place. Plant organic context.",
        skills: [],
        principles: ["separate-before-serializing-shared-state"],
      },
      {
        n: 3,
        title: "author organic prompt",
        summary: "User-like request. No leakage of what's being measured.",
        skills: [],
        principles: [],
      },
      {
        n: 4,
        title: "parallel candidates",
        summary: "N candidates on different models. Same prompt, different dirs.",
        skills: ["arena"],
        principles: [],
      },
      {
        n: 5,
        title: "blinded judge",
        summary: "Judge sees outputs by sanitized label. Never sees the model name.",
        skills: ["arena"],
        principles: [],
      },
      {
        n: 6,
        title: "verify chain",
        summary: "Read transcripts. Confirm files actually opened. Grade from code shape.",
        skills: [],
        principles: ["prove-it-works"],
      },
      {
        n: 7,
        title: "synthesize verdict",
        summary: "Compare your read to the judge's. Resolve disagreement. Recommend.",
        skills: [],
        principles: [],
      },
    ],
  },
  {
    id: "autonomous-run",
    title: "autonomous run",
    purpose: "Drive a long task to completion without stopping.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "state the exit condition",
        summary: "Checkable predicate before the first iteration. Vague goals stall.",
        skills: [],
        principles: [],
      },
      {
        n: 2,
        title: "pick wake mechanism",
        summary: "/loop with an event watcher, or a fixed-interval heartbeat.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "iterate: change, verify, commit",
        summary: "Smallest change the evidence justifies. Revert if the predicate doesn't move.",
        skills: [],
        principles: ["prove-it-works"],
      },
      {
        n: 4,
        title: "checkpoint each iteration",
        summary: "Log what changed and whether the predicate moved.",
        skills: ["show-me-your-work"],
        principles: [],
      },
      {
        n: 5,
        title: "stop when done or stuck",
        summary: "Predicate met, or two consecutive no-progress iterations. Surface stalls.",
        skills: [],
        principles: [],
      },
    ],
  },
  {
    id: "session-pickup",
    title: "session pickup",
    purpose: "Resume or take over a prior agent's in-flight work.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "locate the trail",
        summary: "Find the transcript, cloud URL, or pushed branch. Read decisions.",
        skills: [],
        principles: ["guard-the-context-window"],
      },
      {
        n: 2,
        title: "reconstruct state",
        summary: "Name branch, worktree, landed commits, open todos, prior decisions.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "diff done vs pending",
        summary: "Compare shipped vs planned. Name the resume point. Don't redo work.",
        skills: [],
        principles: [],
      },
      {
        n: 4,
        title: "route to playbook",
        summary: "Continue execution, ship a recommendation, ratify, or postmortem.",
        skills: [],
        principles: [],
      },
      {
        n: 5,
        title: "verify inherited claims",
        summary: "Prove inherited work on the real artifact. Passing self-report is not proof.",
        skills: ["control"],
        principles: ["prove-it-works"],
      },
    ],
  },
  {
    id: "multi-phase-plan",
    title: "multi-phase plan",
    purpose: "Work that spans phases or stacked PRs. Delegates to references/plan.md.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "triage scope",
        summary: "Skip plan for 1-2 files. Plan for 3+ files, architecture, or competing approaches.",
        skills: [],
        principles: [],
      },
      {
        n: 2,
        title: "re-read principles",
        summary: "Read the orchestrator's principles section and any leaf you'll apply.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "scope and constraints",
        summary: "Scope, constraints, patterns, definition of done in one paragraph.",
        skills: [],
        principles: ["never-block-on-the-human"],
      },
      {
        n: 4,
        title: "explore in subagents",
        summary: "Delegate codebase exploration to poteto-agent or composer-2.5-fast.",
        skills: ["poteto-agent", "composer-2.5-fast"],
        principles: ["guard-the-context-window"],
      },
      {
        n: 5,
        title: "write the plan",
        summary: "overview.md plus phase files. Phase sizing 2-3 files, 8-10 phases preferred.",
        skills: [],
        principles: [
          "foundational-thinking",
          "exhaust-the-design-space",
          "redesign-from-first-principles",
        ],
      },
      {
        n: 6,
        title: "verification per phase",
        summary: "Each phase needs static checks (type/lint) and runtime via control.",
        skills: ["control"],
        principles: ["prove-it-works"],
      },
      {
        n: 7,
        title: "implementation guidance",
        summary: "Name non-negotiables: how, interrogate, /deslop, show-me-your-work, babysit.",
        skills: ["how", "interrogate", "unslop", "show-me-your-work"],
        principles: [],
      },
      {
        n: 8,
        title: "hand back",
        summary: "Summarize phases, scope, skills, verification. Stop. User decides when to start.",
        skills: [],
        principles: [],
      },
    ],
  },
  {
    id: "opening-a-pr",
    title: "opening a PR",
    purpose: "The terminal playbook chained to from every other shipping playbook.",
    chainsToOpeningPR: false,
    steps: [
      {
        n: 1,
        title: "work in a worktree",
        summary: "Git worktree off main. Subagents inherit it.",
        skills: [],
        principles: ["separate-before-serializing-shared-state"],
      },
      {
        n: 2,
        title: "commit liberally",
        summary: "Rebase into small ordered commits before opening. Each could be its own PR.",
        skills: [],
        principles: [],
      },
      {
        n: 3,
        title: "deslop and unslop",
        summary: "Run /deslop before commit. Apply unslop to description and bodies.",
        skills: ["unslop", "deslop"],
        principles: [],
      },
      {
        n: 4,
        title: "small PRs, stacks",
        summary: "Five narrow over one fat. Stack follow-ups. No boilerplate on small PRs.",
        skills: [],
        principles: ["laziness-protocol"],
      },
      {
        n: 5,
        title: "check and babysit",
        summary: "gh pr view. If the parent owns the task, run babysit. Subagents return the URL.",
        skills: ["babysit"],
        principles: [],
      },
    ],
  },
];

const WORKFLOW_SKILLS: WorkflowSkill[] = [
  {
    id: "how",
    title: "how",
    summary:
      "Walk a subsystem. Parallel explorers and a synthesizer. Critic mode applies boundary-discipline via its critique rubric.",
    principles: ["boundary-discipline"],
  },
  {
    id: "why",
    title: "why",
    summary:
      "Investigate motivation. Up to seven parallel investigators across source control, tickets, docs, chat, infra, errors, analytics.",
    principles: [],
  },
  {
    id: "architect",
    title: "architect",
    summary:
      "Settle types and module shape before code. Phases A through E. Bundled runner-prompt pulls in six more principles at runtime.",
    principles: [
      "boundary-discipline",
      "encode-lessons-in-structure",
      "exhaust-the-design-space",
      "fix-root-causes",
      "foundational-thinking",
      "laziness-protocol",
      "make-operations-idempotent",
      "minimize-reader-load",
      "outcome-oriented-execution",
      "redesign-from-first-principles",
      "separate-before-serializing-shared-state",
      "subtract-before-you-add",
    ],
  },
  {
    id: "arena",
    title: "arena",
    summary: "N parallel candidates at one task. Synthesize the strongest with grafts from losers.",
    principles: [
      "laziness-protocol",
      "prove-it-works",
      "redesign-from-first-principles",
      "separate-before-serializing-shared-state",
    ],
  },
  {
    id: "interrogate",
    title: "interrogate",
    summary:
      "Four reviewers on four models adversarially review a diff. The rubric grounds checks in boundary-discipline.",
    principles: ["boundary-discipline"],
  },
  {
    id: "tdd",
    title: "tdd",
    summary: "Failing test first when the bug has a cheap local test path.",
    principles: [],
  },
  {
    id: "reflect",
    title: "reflect",
    summary: "Mine the transcript for learnings. Route to skill edits via create-skill.",
    principles: ["encode-lessons-in-structure"],
  },
  {
    id: "automate-me",
    title: "automate-me",
    summary:
      "Mine your transcripts. Draft a <name>-mode skill from how you've actually worked. Routes through pstack underneath.",
    principles: [],
  },
  {
    id: "figure-it-out",
    title: "figure-it-out",
    summary: "Design a bespoke, auditable playbook for work no bundled playbook fits.",
    principles: [
      "encode-lessons-in-structure",
      "foundational-thinking",
      "laziness-protocol",
      "never-block-on-the-human",
      "prove-it-works",
      "separate-before-serializing-shared-state",
    ],
  },
  {
    id: "show-me-your-work",
    title: "show-me-your-work",
    summary: "Decision trail TSV for long, autonomous, or multi-phase work.",
    principles: ["encode-lessons-in-structure"],
  },
  {
    id: "unslop",
    title: "unslop",
    summary: "Cut AI tells from prose. Patterns and their fixes.",
    principles: [],
  },
  {
    id: "typescript-best-practices",
    title: "typescript-best-practices",
    summary: "Rules grounding type-system discipline in TS syntax.",
    principles: ["boundary-discipline", "type-system-discipline"],
  },
  {
    id: "create-skill",
    title: "create-skill",
    summary: "Cursor built-in. Authors SKILL.md files.",
    principles: [],
    external: true,
    surface: "external",
  },
  {
    id: "babysit",
    title: "babysit",
    summary: "Cursor built-in. Runs after opening a PR.",
    principles: [],
    external: true,
    surface: "external",
  },
  {
    id: "deslop",
    title: "deslop",
    summary: "Slash command from cursor-team-kit. Runs before every commit.",
    principles: [],
    external: true,
    surface: "external",
  },
  {
    id: "control",
    title: "control",
    summary:
      "Stand-in for the matching control-cli or control-ui skill in cursor-team-kit. Drives the runtime surface.",
    principles: [],
    external: true,
    surface: "control",
  },
  {
    id: "composer-2.5-fast",
    title: "composer-2.5-fast",
    summary: "Subagent model used for code-writing delegates. Tightly scoped prompt; parent reviews diff.",
    principles: [],
    external: true,
    surface: "subagent",
  },
  {
    id: "poteto-agent",
    title: "poteto-agent",
    summary:
      "The wrapper subagent. Re-reads poteto-mode SKILL.md before any work so every fan-out enters with the same orchestrator context.",
    principles: [],
    external: true,
    surface: "subagent",
  },
];

const PRINCIPLE_GROUP_ORDER: PrincipleGroup[] = [
  "core",
  "architecture",
  "verification",
  "delegation",
  "meta",
];

const PRINCIPLE_GROUP_LABELS: Record<PrincipleGroup, string> = {
  core: "core",
  architecture: "architecture",
  verification: "verification",
  delegation: "delegation",
  meta: "meta",
};

const PRINCIPLES: Principle[] = [
  { id: "laziness-protocol", group: "core", title: "laziness protocol", summary: "Bias toward deletion and the smallest change." },
  { id: "foundational-thinking", group: "core", title: "foundational thinking", summary: "Get data structures right before writing logic." },
  { id: "redesign-from-first-principles", group: "core", title: "redesign from first principles", summary: "Redesign as if the new requirement had been foundational from day one." },
  { id: "subtract-before-you-add", group: "core", title: "subtract before you add", summary: "Remove dead weight first, then build on the simpler base." },
  { id: "minimize-reader-load", group: "core", title: "minimize reader load", summary: "Count layers and hidden state. Collapse one-caller wrappers." },
  { id: "outcome-oriented-execution", group: "core", title: "outcome-oriented execution", summary: "Converge on the target architecture. Don't preserve throwaway compatibility." },
  { id: "experience-first", group: "core", title: "experience first", summary: "Choose user delight over implementation convenience." },
  { id: "exhaust-the-design-space", group: "core", title: "exhaust the design space", summary: "Build 2 to 3 competing prototypes before committing." },
  { id: "build-the-lever", group: "core", title: "build the lever", summary: "Build the tool that amortizes the work once you know the recipe." },
  { id: "boundary-discipline", group: "architecture", title: "boundary discipline", summary: "Guards at system boundaries. Trust internal types." },
  { id: "type-system-discipline", group: "architecture", title: "type system discipline", summary: "Make illegal states unrepresentable. Brand primitives. Parse at boundaries." },
  { id: "make-operations-idempotent", group: "architecture", title: "make operations idempotent", summary: "Operations converge to the same end state under crash and retry." },
  { id: "migrate-callers-then-delete-legacy-apis", group: "architecture", title: "migrate callers then delete legacy APIs", summary: "Migrate and delete in one wave. No parallel APIs." },
  { id: "separate-before-serializing-shared-state", group: "architecture", title: "separate before serializing shared state", summary: "Eliminate sharing first. Serialize structurally only when sharing is real." },
  { id: "prove-it-works", group: "verification", title: "prove it works", summary: "Verify against the real artifact, not a proxy or 'it compiles'." },
  { id: "fix-root-causes", group: "verification", title: "fix root causes", summary: "Reproduce first. Ask why until you reach root." },
  { id: "guard-the-context-window", group: "delegation", title: "guard the context window", summary: "Route bulk to subagents. Keep summaries in the main thread." },
  { id: "never-block-on-the-human", group: "delegation", title: "never block on the human", summary: "Proceed on reversible work. Let humans course-correct." },
  { id: "encode-lessons-in-structure", group: "meta", title: "encode lessons in structure", summary: "Encode recurring lessons as lints, flags, runtime checks, or scripts." },
];

const ACCENT = "#2e7d32";

const CHIP_BASE =
  "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] transition-[color,border-color,background-color,opacity] duration-200 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(46,125,50,0.18)]";

const ROW_BASE =
  "group flex w-full cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left font-mono text-[11px] transition-[color,border-color,background-color,opacity] duration-200 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(46,125,50,0.18)]";

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-black/20 bg-white px-2.5 py-1.5 font-mono text-[11px] text-[color:var(--ink)] cursor-pointer transition-[color,border-color,background-color,transform] duration-150 hover:border-[color:var(--ink)] active:translate-y-px focus-visible:outline-none focus-visible:border-[#2e7d32] focus-visible:shadow-[0_0_0_2px_rgba(46,125,50,0.16)]";

const SUB_CHIP =
  "inline-flex items-center gap-1 cursor-pointer rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] transition-[color,border-color,background-color] duration-150 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(46,125,50,0.18)]";

export function SkillGraph() {
  const [selection, setSelection] = useState<Selection>(ORCHESTRATOR);

  const playbookById = useMemo(() => new Map(PLAYBOOKS.map((p) => [p.id, p])), []);
  const skillById = useMemo(() => new Map(WORKFLOW_SKILLS.map((s) => [s.id, s])), []);
  const principleById = useMemo(() => new Map(PRINCIPLES.map((p) => [p.id, p])), []);

  // Per-playbook union of skill/principle citations across steps.
  const playbookSummary = useMemo(() => {
    const m = new Map<string, { skills: Set<string>; principles: Set<string> }>();
    for (const p of PLAYBOOKS) {
      const skills = new Set<string>();
      const principles = new Set<string>();
      for (const step of p.steps) {
        step.skills.forEach((s) => skills.add(s));
        step.principles.forEach((pr) => principles.add(pr));
      }
      m.set(p.id, { skills, principles });
    }
    return m;
  }, []);

  // Reverse indexes
  const playbooksBySkill = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of PLAYBOOKS) {
      playbookSummary.get(p.id)?.skills.forEach((s) => {
        const arr = m.get(s) ?? [];
        arr.push(p.id);
        m.set(s, arr);
      });
    }
    return m;
  }, [playbookSummary]);

  const playbooksByPrinciple = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of PLAYBOOKS) {
      playbookSummary.get(p.id)?.principles.forEach((pr) => {
        const arr = m.get(pr) ?? [];
        arr.push(p.id);
        m.set(pr, arr);
      });
    }
    return m;
  }, [playbookSummary]);

  const skillsByPrinciple = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of WORKFLOW_SKILLS) {
      for (const pr of s.principles) {
        const arr = m.get(pr) ?? [];
        arr.push(s.id);
        m.set(pr, arr);
      }
    }
    return m;
  }, []);

  const lit = useMemo(() => {
    const litPlaybooks = new Set<string>();
    const litSkills = new Set<string>();
    const litPrinciples = new Set<string>();

    if (selection.kind === "orchestrator") {
      PLAYBOOKS.forEach((p) => litPlaybooks.add(p.id));
      PRINCIPLES.forEach((p) => litPrinciples.add(p.id));
      WORKFLOW_SKILLS.forEach((s) => litSkills.add(s.id));
    } else if (selection.kind === "playbook") {
      const p = playbookById.get(selection.id);
      if (p) {
        litPlaybooks.add(p.id);
        playbookSummary.get(p.id)?.skills.forEach((s) => litSkills.add(s));
        playbookSummary.get(p.id)?.principles.forEach((pr) => litPrinciples.add(pr));
        if (p.chainsToOpeningPR) litPlaybooks.add("opening-a-pr");
      }
    } else if (selection.kind === "skill") {
      litSkills.add(selection.id);
      (playbooksBySkill.get(selection.id) ?? []).forEach((pid) => litPlaybooks.add(pid));
      const s = skillById.get(selection.id);
      s?.principles.forEach((pr) => litPrinciples.add(pr));
    } else if (selection.kind === "principle") {
      litPrinciples.add(selection.id);
      (playbooksByPrinciple.get(selection.id) ?? []).forEach((pid) => litPlaybooks.add(pid));
      (skillsByPrinciple.get(selection.id) ?? []).forEach((sid) => litSkills.add(sid));
    }

    return { litPlaybooks, litSkills, litPrinciples };
  }, [
    selection,
    playbookById,
    skillById,
    playbookSummary,
    playbooksBySkill,
    playbooksByPrinciple,
    skillsByPrinciple,
  ]);

  const isFocused = (kind: NodeKind, id: string) =>
    selection.kind === kind && selection.id === id;

  const isLit = (kind: NodeKind, id: string) => {
    if (kind === "playbook") return lit.litPlaybooks.has(id);
    if (kind === "skill") return lit.litSkills.has(id);
    if (kind === "principle") return lit.litPrinciples.has(id);
    return true;
  };

  const principlesByGroup = useMemo(() => {
    const m = new Map<PrincipleGroup, Principle[]>();
    for (const g of PRINCIPLE_GROUP_ORDER) m.set(g, []);
    for (const p of PRINCIPLES) m.get(p.group)?.push(p);
    return m;
  }, []);

  const selectionInfo = useMemo(() => {
    if (selection.kind === "orchestrator") {
      return {
        kindLabel: "orchestrator",
        title: "poteto-mode",
        body: "Reads the inline principles index in full at task start. Matches the task to a playbook. Copies its steps verbatim into the todolist before reasoning. Subagents spawned inside a playbook step fork into the poteto-agent wrapper, which re-reads the same SKILL.md.",
        stats: [
          `${PLAYBOOKS.length} playbooks`,
          `${WORKFLOW_SKILLS.filter((s) => !s.external).length} workflow skills`,
          `${PRINCIPLES.length} principles`,
        ],
      };
    }
    if (selection.kind === "playbook") {
      const p = playbookById.get(selection.id);
      if (!p) return null;
      const sum = playbookSummary.get(p.id);
      const stats: string[] = [`${p.steps.length} steps`];
      if ((sum?.skills.size ?? 0) > 0) {
        stats.push(`${sum?.skills.size} skill${sum?.skills.size === 1 ? "" : "s"}`);
      }
      if ((sum?.principles.size ?? 0) > 0) {
        stats.push(`${sum?.principles.size} principle${sum?.principles.size === 1 ? "" : "s"}`);
      }
      if (p.chainsToOpeningPR) stats.push("chains to opening-a-pr");
      return {
        kindLabel: "playbook",
        title: p.title,
        body: p.purpose,
        stats,
      };
    }
    if (selection.kind === "skill") {
      const s = skillById.get(selection.id);
      if (!s) return null;
      const callers = playbooksBySkill.get(s.id) ?? [];
      const stats: string[] = [];
      stats.push(
        callers.length > 0
          ? `referenced by ${callers.length} playbook${callers.length === 1 ? "" : "s"}`
          : "referenced indirectly",
      );
      if (s.principles.length > 0) {
        stats.push(
          `cites ${s.principles.length} principle${s.principles.length === 1 ? "" : "s"}`,
        );
      }
      const kindLabel =
        s.surface === "subagent"
          ? "subagent"
          : s.surface === "control"
            ? "control surface"
            : s.external
              ? "external skill"
              : "workflow skill";
      return { kindLabel, title: s.title, body: s.summary, stats };
    }
    if (selection.kind === "principle") {
      const p = principleById.get(selection.id);
      if (!p) return null;
      const playbookCallers = playbooksByPrinciple.get(p.id) ?? [];
      const skillCallers = skillsByPrinciple.get(p.id) ?? [];
      const stats: string[] = [];
      if (playbookCallers.length > 0) {
        stats.push(
          `cited by ${playbookCallers.length} playbook${playbookCallers.length === 1 ? "" : "s"}`,
        );
      }
      if (skillCallers.length > 0) {
        stats.push(
          `used in ${skillCallers.length} workflow skill${skillCallers.length === 1 ? "" : "s"}`,
        );
      }
      if (stats.length === 0) stats.push("carried by the orchestrator");
      return { kindLabel: `${p.group} principle`, title: p.title, body: p.summary, stats };
    }
    return null;
  }, [
    selection,
    playbookById,
    skillById,
    principleById,
    playbookSummary,
    playbooksBySkill,
    playbooksByPrinciple,
    skillsByPrinciple,
  ]);

  function chipClass(kind: NodeKind, id: string) {
    const focused = isFocused(kind, id);
    const lit = isLit(kind, id);
    if (focused) {
      return `${CHIP_BASE} border-[#2e7d32] bg-[rgba(46,125,50,0.16)] text-[color:var(--ink)]`;
    }
    if (lit) {
      return `${CHIP_BASE} border-[#2e7d32]/60 bg-[rgba(46,125,50,0.06)] text-[color:var(--ink)] hover:border-[#2e7d32]`;
    }
    return `${CHIP_BASE} border-black/10 bg-white text-[color:var(--ink-muted)] opacity-60 hover:opacity-100 hover:border-black/30`;
  }

  function rowClass(kind: NodeKind, id: string) {
    const focused = isFocused(kind, id);
    const lit = isLit(kind, id);
    if (focused) {
      return `${ROW_BASE} border-[#2e7d32] bg-[rgba(46,125,50,0.16)] text-[color:var(--ink)]`;
    }
    if (lit) {
      return `${ROW_BASE} border-[#2e7d32]/60 bg-[rgba(46,125,50,0.06)] text-[color:var(--ink)] hover:border-[#2e7d32]`;
    }
    return `${ROW_BASE} border-black/10 bg-white text-[color:var(--ink-muted)] opacity-60 hover:opacity-100 hover:border-black/30`;
  }

  return (
    <figure
      className="not-prose my-9 rounded-3xl border border-black/10 bg-white px-6 pb-6 pt-6 font-mono text-[color:var(--ink)] shadow-[0_22px_60px_-45px_rgba(20,20,19,0.3)] max-[640px]:px-4"
      aria-label="Interactive map of the pstack skill graph"
    >
      {/* header / selection description */}
      <header className="mb-5 flex items-start justify-between gap-4 border-b border-black/10 pb-5 max-[640px]:flex-col">
        <div className="min-w-0 flex-1">
          {selectionInfo ? (
            <>
              <span
                className="mb-1.5 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: ACCENT }}
              >
                {selectionInfo.kindLabel} · {selectionInfo.title}
              </span>
              <p className="m-0 max-w-[64ch] font-sans text-[13.5px] leading-[1.55] text-[color:var(--ink)]">
                {selectionInfo.body}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-muted)]">
                {selectionInfo.stats.map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </p>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            className={BTN}
            onClick={() => setSelection(ORCHESTRATOR)}
            aria-label="reset to orchestrator"
          >
            <RotateCcw size={12} strokeWidth={2} /> reset
          </button>
        </div>
      </header>

      {/* orchestrator card */}
      <button
        type="button"
        onClick={() => setSelection(ORCHESTRATOR)}
        className={`mb-5 flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors duration-200 ${
          selection.kind === "orchestrator"
            ? "border-[#2e7d32] bg-[rgba(46,125,50,0.10)]"
            : "border-black/10 bg-[rgba(46,125,50,0.03)] hover:border-[#2e7d32]/60"
        }`}
        aria-label="select orchestrator"
      >
        <Layers size={16} strokeWidth={2} style={{ color: ACCENT }} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="mb-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink)]">
            orchestrator
          </div>
          <div className="font-mono text-[12.5px] text-[color:var(--ink)]">/poteto-mode</div>
          <div className="mt-1 max-w-[64ch] font-sans text-[12.5px] leading-[1.5] text-[color:var(--ink-muted)]">
            One skill. Indexes every principle inline, then routes to one of fifteen playbooks
            based on the task.
          </div>
        </div>
      </button>

      {/* playbook row */}
      <section className="mb-5">
        <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-muted)]">
          playbooks · 15
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {PLAYBOOKS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={chipClass("playbook", p.id)}
              onClick={() => setSelection({ kind: "playbook", id: p.id })}
              title={p.purpose}
            >
              {p.title}
              {p.chainsToOpeningPR ? <span className="ml-1 opacity-60">↳PR</span> : null}
            </button>
          ))}
        </div>
      </section>

      {selection.kind === "playbook" ? (
        <DagView
          playbook={playbookById.get(selection.id)!}
          openingPR={playbookById.get("opening-a-pr") ?? null}
          skillById={skillById}
          principleById={principleById}
          onSelect={setSelection}
        />
      ) : (
        <CatalogView
          principlesByGroup={principlesByGroup}
          playbooksBySkill={playbooksBySkill}
          playbooksByPrinciple={playbooksByPrinciple}
          skillsByPrinciple={skillsByPrinciple}
          rowClass={rowClass}
          onSelect={setSelection}
        />
      )}

      {/* footer hint */}
      <footer className="mt-5 flex items-center gap-2 border-t border-black/10 pt-4 font-mono text-[10.5px] text-[color:var(--ink-muted)]">
        <Box size={11} strokeWidth={2} />
        <span>
          tap a playbook to see its step DAG with the skills and principles each step pulls in.
          tap a workflow skill or principle to see the catalog with everything that uses it lit.
        </span>
      </footer>
    </figure>
  );
}

function DagView({
  playbook,
  openingPR,
  skillById,
  principleById,
  onSelect,
}: {
  playbook: Playbook;
  openingPR: Playbook | null;
  skillById: Map<string, WorkflowSkill>;
  principleById: Map<string, Principle>;
  onSelect: (s: Selection) => void;
}) {
  return (
    <section className="mt-2">
      <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-muted)]">
        execution DAG · {playbook.steps.length} step{playbook.steps.length === 1 ? "" : "s"}
      </h3>
      <ol className="m-0 grid list-none gap-0 p-0">
        {playbook.steps.map((step, idx) => (
          <li key={step.n} className="m-0 list-none p-0">
            <StepNode
              step={step}
              skillById={skillById}
              principleById={principleById}
              onSelect={onSelect}
            />
            {idx < playbook.steps.length - 1 ? <Connector /> : null}
          </li>
        ))}
        {playbook.chainsToOpeningPR && openingPR ? (
          <>
            <li className="m-0 list-none p-0">
              <Connector />
            </li>
            <li className="m-0 list-none p-0">
              <button
                type="button"
                onClick={() => onSelect({ kind: "playbook", id: openingPR.id })}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#2e7d32]/40 bg-[rgba(46,125,50,0.04)] px-4 py-3 text-left transition-colors duration-200 hover:border-[#2e7d32] hover:bg-[rgba(46,125,50,0.1)]"
              >
                <ArrowRight size={14} strokeWidth={2} style={{ color: ACCENT }} className="shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>
                    chains to playbook
                  </div>
                  <div className="font-mono text-[12px] text-[color:var(--ink)]">
                    opening a PR · {openingPR.steps.length} steps
                  </div>
                  <div className="mt-0.5 font-sans text-[11.5px] leading-[1.4] text-[color:var(--ink-muted)]">
                    {openingPR.purpose}
                  </div>
                </div>
                <ChevronDown size={14} strokeWidth={2} className="ml-auto shrink-0 text-[color:var(--ink-muted)]" />
              </button>
            </li>
          </>
        ) : null}
      </ol>
    </section>
  );
}

function StepNode({
  step,
  skillById,
  principleById,
  onSelect,
}: {
  step: PlaybookStep;
  skillById: Map<string, WorkflowSkill>;
  principleById: Map<string, Principle>;
  onSelect: (s: Selection) => void;
}) {
  return (
    <article className="flex items-start gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 transition-colors duration-200 hover:border-black/25">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(46,125,50,0.12)] font-mono text-[11px] font-semibold"
        style={{ color: ACCENT }}
      >
        {String(step.n).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[12.5px] font-semibold text-[color:var(--ink)]">
          {step.title}
        </div>
        <p className="m-0 mt-0.5 font-sans text-[12px] leading-[1.5] text-[color:var(--ink-muted)]">
          {step.summary}
        </p>
        {step.skills.length > 0 || step.principles.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
            {step.skills.length > 0 ? (
              <span className="flex flex-wrap items-center gap-1">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
                  uses
                </span>
                {step.skills.map((sid) => {
                  const s = skillById.get(sid);
                  if (!s) return null;
                  const isExternal = s.external || s.surface !== undefined;
                  return (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => onSelect({ kind: "skill", id: sid })}
                      className={`${SUB_CHIP} ${
                        isExternal
                          ? "border-black/15 bg-white text-[color:var(--ink-muted)] hover:border-black/40 hover:text-[color:var(--ink)]"
                          : "border-[#2e7d32]/40 bg-[rgba(46,125,50,0.06)] text-[color:var(--ink)] hover:border-[#2e7d32]"
                      }`}
                      title={s.summary}
                    >
                      {s.title}
                    </button>
                  );
                })}
              </span>
            ) : null}
            {step.principles.length > 0 ? (
              <span className="flex flex-wrap items-center gap-1">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
                  applies
                </span>
                {step.principles.map((pid) => {
                  const p = principleById.get(pid);
                  if (!p) return null;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => onSelect({ kind: "principle", id: pid })}
                      className={`${SUB_CHIP} border-[color:var(--ink)]/20 bg-[color:var(--ink)]/[0.03] text-[color:var(--ink)] hover:border-[color:var(--ink)]`}
                      title={p.summary}
                    >
                      {p.title}
                    </button>
                  );
                })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-start py-1 pl-7">
      <span className="block h-4 w-px bg-black/15" aria-hidden />
    </div>
  );
}

function CatalogView({
  principlesByGroup,
  playbooksBySkill,
  playbooksByPrinciple,
  skillsByPrinciple,
  rowClass,
  onSelect,
}: {
  principlesByGroup: Map<PrincipleGroup, Principle[]>;
  playbooksBySkill: Map<string, string[]>;
  playbooksByPrinciple: Map<string, string[]>;
  skillsByPrinciple: Map<string, string[]>;
  rowClass: (kind: NodeKind, id: string) => string;
  onSelect: (s: Selection) => void;
}) {
  const realSkills = WORKFLOW_SKILLS.filter((s) => !s.external);
  const externals = WORKFLOW_SKILLS.filter((s) => s.external);
  return (
    <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
      <section>
        <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-muted)]">
          workflow skills · {realSkills.length}
          <span className="ml-2 normal-case tracking-normal opacity-60">
            + {externals.length} external
          </span>
        </h3>
        <div className="grid gap-1.5">
          {WORKFLOW_SKILLS.map((s) => {
            const callers = playbooksBySkill.get(s.id) ?? [];
            return (
              <button
                key={s.id}
                type="button"
                className={rowClass("skill", s.id)}
                onClick={() => onSelect({ kind: "skill", id: s.id })}
                title={`${callers.length} playbook${callers.length === 1 ? "" : "s"}, cites ${s.principles.length} principle${s.principles.length === 1 ? "" : "s"}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold">{s.title}</span>
                    {s.external ? (
                      <span className="rounded-sm border border-black/15 px-1 py-px text-[8.5px] uppercase tracking-[0.18em] text-[color:var(--ink-muted)]">
                        {s.surface === "subagent" ? "agent" : s.surface === "control" ? "ctrl" : "ext"}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-sans text-[11.5px] leading-[1.4] text-[color:var(--ink-muted)] group-hover:text-[color:var(--ink)]">
                    {s.summary}
                  </span>
                </span>
                <span className="ml-2 shrink-0 self-center text-[10px] text-[color:var(--ink-muted)]">
                  {callers.length}×
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-muted)]">
          principles · {PRINCIPLES.length}
        </h3>
        <div className="grid gap-3">
          {PRINCIPLE_GROUP_ORDER.map((g) => (
            <div key={g}>
              <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
                {PRINCIPLE_GROUP_LABELS[g]}
              </div>
              <div className="grid gap-1">
                {(principlesByGroup.get(g) ?? []).map((p) => {
                  const playbookCallers = playbooksByPrinciple.get(p.id) ?? [];
                  const skillCallers = skillsByPrinciple.get(p.id) ?? [];
                  const total = playbookCallers.length + skillCallers.length;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={rowClass("principle", p.id)}
                      onClick={() => onSelect({ kind: "principle", id: p.id })}
                      title={`${playbookCallers.length} playbook${playbookCallers.length === 1 ? "" : "s"}, ${skillCallers.length} workflow skill${skillCallers.length === 1 ? "" : "s"}`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-semibold">{p.title}</span>
                        <span className="font-sans text-[11.5px] leading-[1.4] text-[color:var(--ink-muted)] group-hover:text-[color:var(--ink)]">
                          {p.summary}
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 self-center text-[10px] text-[color:var(--ink-muted)]">
                        {total}×
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
