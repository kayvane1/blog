export enum Tag {
  Observability = "observability",
  MLSystems = "ml systems",
  Infra = "infra",
  Tooling = "tooling",
  Modal = "modal",
  Datadog = "datadog",
  Python = "python",
  LLM = "llm",
  VLLM = "vllm",
  GPU = "gpu",
  GameDev = "game-dev",
  GPT = "gpt",
  Suno = "suno",
  ImageGen = "image-gen",
  Outlines = "outlines",
  StructuredGeneration = "structured-generation",
  Pydantic = "pydantic",
  Regex = "regex",
}

export const TAGS = Object.values(Tag);
export const TAG_SET = new Set<string>(TAGS);

export function isTag(value: string): value is Tag {
  return TAG_SET.has(value);
}
