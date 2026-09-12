import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { ClaudeTranslator, TranslationError } from "../translate/index.js";
import type { TranslateRequest } from "../translate/types.js";

const request: TranslateRequest = {
  text: "ไปไหนมา",
  from: "th",
  to: "en",
  writer: { name: "Ploy", gender: "female" },
  reader: { name: "Sam" },
  context: [],
  glossary: [],
};

/** Stands in for the SDK so the request shape can be asserted without a network call. */
function fakeClient(response: unknown, parse = vi.fn().mockResolvedValue(response)) {
  return { client: { messages: { parse } } as unknown as Anthropic, parse };
}

const goodResponse = {
  stop_reason: "end_turn",
  parsed_output: {
    translation: "where've you been?",
    literal: "",
    notes: null,
    register: "casual",
    confidence: "high",
  },
};

describe("ClaudeTranslator", () => {
  it("sends the cached system prefix, the model and the effort", async () => {
    const { client, parse } = fakeClient(goodResponse);
    const translator = new ClaudeTranslator(
      { model: "claude-opus-5", effort: "low" },
      client,
    );

    await translator.translate(request);

    const params = parse.mock.calls[0]![0] as Record<string, any>;
    expect(params.model).toBe("claude-opus-5");
    expect(params.output_config.effort).toBe("low");
    // The system prompt never varies, so it carries the cache breakpoint.
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.messages[0].content).toContain("Thai -> English");
  });

  it("normalises empty optional fields to null", async () => {
    const { client } = fakeClient(goodResponse);
    const result = await new ClaudeTranslator(
      { model: "claude-opus-5", effort: "low" },
      client,
    ).translate(request);

    expect(result.translation).toBe("where've you been?");
    expect(result.literal).toBeNull();
    expect(result.notes).toBeNull();
  });

  it("treats a refusal as a translation error rather than reading the content", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", stop_details: { category: "other" } });
    const translator = new ClaudeTranslator({ model: "claude-opus-5", effort: "low" }, client);

    await expect(translator.translate(request)).rejects.toMatchObject({
      name: "TranslationError",
      code: "refused",
    });
  });

  it("errors when the model returns nothing parseable", async () => {
    const { client } = fakeClient({ stop_reason: "end_turn", parsed_output: null });
    const translator = new ClaudeTranslator({ model: "claude-opus-5", effort: "low" }, client);

    await expect(translator.translate(request)).rejects.toMatchObject({ code: "unparseable" });
  });

  it("wraps transport failures", async () => {
    const parse = vi.fn().mockRejectedValue(new Error("connection reset"));
    const { client } = fakeClient(null, parse);
    const translator = new ClaudeTranslator({ model: "claude-opus-5", effort: "low" }, client);

    const error = await translator.translate(request).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TranslationError);
    expect((error as TranslationError).code).toBe("api_error");
  });
});
