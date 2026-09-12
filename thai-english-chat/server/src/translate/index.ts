import { ClaudeTranslator } from "./claude.js";
import { StubTranslator } from "./stub.js";
import type { Translator } from "./types.js";
import type { Config } from "../config.js";

export * from "./types.js";
export { ClaudeTranslator } from "./claude.js";
export { StubTranslator } from "./stub.js";
export { buildUserPrompt, SYSTEM_PROMPT } from "./prompt.js";

export function createTranslator(config: Config): Translator {
  if (!config.anthropicApiKey) return new StubTranslator();
  return new ClaudeTranslator({
    apiKey: config.anthropicApiKey,
    model: config.translationModel,
    effort: config.translationEffort,
  });
}
