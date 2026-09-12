import type { Lang } from "./protocol.js";

const THAI_BLOCK = /[\u0E00-\u0E7F]/gu;
const LATIN_LETTER = /[A-Za-z]/gu;

/**
 * Which language did someone actually type in?
 *
 * The member's profile language is only a default: Thai speakers routinely
 * drop a whole English sentence in, and vice versa. Script counting settles it
 * without an API round trip. Thai text carries almost no Latin letters, so a
 * low threshold is right -- "โอเค check in 3 ทุ่ม" is Thai with English words
 * in it, not English.
 */
export function detectLang(text: string, fallback: Lang = "en"): Lang {
  const thai = text.match(THAI_BLOCK)?.length ?? 0;
  const latin = text.match(LATIN_LETTER)?.length ?? 0;
  if (thai === 0 && latin === 0) return fallback;
  if (thai === 0) return "en";
  if (latin === 0) return "th";
  return thai / (thai + latin) >= 0.2 ? "th" : "en";
}

/**
 * "555" is Thai for "hahaha" (ha = the number five), and it is one of the most
 * common things anyone types. It looks like a digit run, so it has to be
 * rescued before the neutral-text shortcut below throws it away untranslated.
 */
const THAI_LAUGHTER = /^5{3,}[+\s!.?]*$/u;

/**
 * Messages made entirely of emoji, digits, punctuation or URLs mean the same
 * thing on both sides -- translating them wastes a call and invites the model
 * to "helpfully" rewrite a phone number.
 */
export function isLanguageNeutral(text: string): boolean {
  if (THAI_LAUGHTER.test(text.trim())) return false;
  const stripped = text
    .replace(/https?:\/\/\S+/gu, "")
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{P}\p{S}\p{N}\s]/gu, "");
  return stripped.length === 0;
}
