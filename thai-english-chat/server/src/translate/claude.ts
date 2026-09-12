import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildUserPrompt, SYSTEM_BLOCKS } from "./prompt.js";
import { translationSchema, TranslationError } from "./types.js";
import type { TranslateRequest, Translation, Translator } from "./types.js";

export interface ClaudeTranslatorOptions {
  apiKey?: string;
  model: string;
  /** How hard the model deliberates. Chat wants latency, so "low" is the default. */
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export class ClaudeTranslator implements Translator {
  readonly kind = "claude" as const;
  readonly model: string;
  private readonly client: Anthropic;
  private readonly opts: Required<Omit<ClaudeTranslatorOptions, "apiKey">>;

  constructor(options: ClaudeTranslatorOptions, client?: Anthropic) {
    this.model = options.model;
    this.opts = {
      model: options.model,
      effort: options.effort,
      maxTokens: options.maxTokens ?? 2048,
      timeoutMs: options.timeoutMs ?? 30_000,
      maxRetries: options.maxRetries ?? 3,
    };
    this.client =
      client ??
      new Anthropic({
        ...(options.apiKey ? { apiKey: options.apiKey } : {}),
        timeout: this.opts.timeoutMs,
        maxRetries: this.opts.maxRetries,
      });
  }

  async translate(req: TranslateRequest): Promise<Translation> {
    let response;
    try {
      response = await this.client.messages.parse({
        model: this.opts.model,
        max_tokens: this.opts.maxTokens,
        system: SYSTEM_BLOCKS,
        messages: [{ role: "user", content: buildUserPrompt(req) }],
        output_config: {
          effort: this.opts.effort,
          format: zodOutputFormat(translationSchema),
        },
      });
    } catch (err) {
      throw new TranslationError(
        `translation request failed: ${err instanceof Error ? err.message : String(err)}`,
        "api_error",
        err,
      );
    }

    // A safety classifier can decline with HTTP 200 -- check before reading content.
    if (response.stop_reason === "refusal") {
      throw new TranslationError(
        "the model declined to translate this message",
        "refused",
        response.stop_details,
      );
    }

    const parsed = response.parsed_output;
    if (!parsed || typeof parsed.translation !== "string") {
      throw new TranslationError("model returned no parseable translation", "unparseable");
    }

    return {
      translation: parsed.translation,
      literal: emptyToNull(parsed.literal),
      notes: emptyToNull(parsed.notes),
      register: parsed.register,
      confidence: parsed.confidence,
    };
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
