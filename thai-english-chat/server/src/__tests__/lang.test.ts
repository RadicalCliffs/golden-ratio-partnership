import { describe, expect, it } from "vitest";
import { detectLang, isLanguageNeutral } from "../lang.js";

describe("detectLang", () => {
  it("reads plain Thai as Thai", () => {
    expect(detectLang("ไปไหนมาอ่ะ")).toBe("th");
  });

  it("reads plain English as English", () => {
    expect(detectLang("where have you been")).toBe("en");
  });

  it("treats Thai with English loanwords as Thai", () => {
    // The kind of line a Bangkok speaker actually types.
    expect(detectLang("โอเคเดี๋ยว check in ตอน 3 ทุ่มนะ")).toBe("th");
  });

  it("treats English with one Thai word as English", () => {
    expect(detectLang("can you grab some ข้าว on the way home tonight please")).toBe("en");
  });

  it("falls back to the member's own language when there are no letters", () => {
    expect(detectLang("555 :)", "th")).toBe("th");
    expect(detectLang("", "en")).toBe("en");
  });
});

describe("isLanguageNeutral", () => {
  it("flags emoji-only and punctuation-only messages", () => {
    expect(isLanguageNeutral("👍")).toBe(true);
    expect(isLanguageNeutral("?!?!")).toBe(true);
    expect(isLanguageNeutral("https://example.com")).toBe(true);
  });

  it("keeps Thai laughter translatable even though it looks like digits", () => {
    // 555 = hahaha. An English reader would just see three fives.
    expect(isLanguageNeutral("555")).toBe(false);
    expect(isLanguageNeutral("55555!!")).toBe(false);
    expect(isLanguageNeutral("250")).toBe(true);
  });

  it("does not flag anything with words in it", () => {
    expect(isLanguageNeutral("ok 👍")).toBe(false);
    expect(isLanguageNeutral("ได้ครับ")).toBe(false);
  });
});
