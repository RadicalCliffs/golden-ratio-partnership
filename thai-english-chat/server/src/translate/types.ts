import { z } from "zod";
import type { Confidence, Gender, Lang, Register, RoomGlossaryEntry } from "../protocol.js";

/** One earlier turn, in whatever language it was written. */
export interface ContextTurn {
  speaker: string;
  lang: Lang;
  text: string;
}

export interface TranslateRequest {
  text: string;
  from: Lang;
  to: Lang;
  writer: { name: string; gender: Gender };
  reader: { name: string };
  context: ContextTurn[];
  glossary: RoomGlossaryEntry[];
}

export const translationSchema = z.object({
  translation: z
    .string()
    .describe("The message as the reader should see it. The only part the reader reads."),
  literal: z
    .string()
    .nullable()
    .describe(
      "Word-for-word reading, only when the natural translation hides a pun, idiom or wordplay. Otherwise null.",
    ),
  notes: z
    .string()
    .nullable()
    .describe(
      "At most one short sentence in the reader's language, only when the reader would otherwise misread the message. Otherwise null.",
    ),
  register: z
    .enum(["casual", "polite", "formal", "blunt", "rude", "flirty"])
    .describe("How the original message reads to a native ear."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Low when the source was ambiguous, garbled, or needed a guess."),
});

export type Translation = z.infer<typeof translationSchema> & {
  register: Register;
  confidence: Confidence;
};

export interface Translator {
  readonly kind: "claude" | "stub";
  readonly model: string;
  translate(req: TranslateRequest): Promise<Translation>;
}

export class TranslationError extends Error {
  constructor(
    message: string,
    readonly code: "refused" | "unparseable" | "api_error",
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TranslationError";
  }
}
