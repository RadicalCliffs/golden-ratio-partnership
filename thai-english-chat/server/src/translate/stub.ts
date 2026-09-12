import type { TranslateRequest, Translation, Translator } from "./types.js";

/**
 * Used when no ANTHROPIC_API_KEY is set, and by the test suite.
 *
 * It marks the message instead of translating it, so it is obvious at a glance
 * that you are looking at stub output and not at a bad translation.
 */
export class StubTranslator implements Translator {
  readonly kind = "stub" as const;
  readonly model = "stub";

  // eslint-disable-next-line @typescript-eslint/require-await
  async translate(req: TranslateRequest): Promise<Translation> {
    return {
      translation: `[${req.from}->${req.to}] ${req.text}`,
      literal: null,
      notes: null,
      register: "casual",
      confidence: "high",
    };
  }
}
