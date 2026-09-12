import { describe, expect, it } from "vitest";
import { cacheKey, isCacheable, TranslationCache } from "../cache.js";
import type { Translation } from "../translate/index.js";

const clean: Translation = {
  translation: "got it",
  literal: null,
  notes: null,
  register: "casual",
  confidence: "high",
};

describe("cacheKey", () => {
  it("is stable for identical inputs", () => {
    const parts = {
      model: "claude-opus-5",
      from: "th",
      to: "en",
      text: "ได้ครับ",
      glossaryVersion: 1,
    } as const;
    expect(cacheKey(parts)).toBe(cacheKey({ ...parts }));
  });

  it("separates direction, model and glossary version", () => {
    const base = {
      model: "claude-opus-5",
      from: "th",
      to: "en",
      text: "เอาสิ",
      glossaryVersion: 1,
    } as const;
    expect(cacheKey({ ...base, from: "en", to: "th" })).not.toBe(cacheKey(base));
    expect(cacheKey({ ...base, model: "claude-sonnet-5" })).not.toBe(cacheKey(base));
    // A new glossary can change every rendering, so it must bust the cache.
    expect(cacheKey({ ...base, glossaryVersion: 2 })).not.toBe(cacheKey(base));
  });
});

describe("isCacheable", () => {
  it("caches short, confident, note-free translations", () => {
    expect(isCacheable("ได้ครับ", clean)).toBe(true);
  });

  it("never caches long or multi-line messages", () => {
    expect(isCacheable("a".repeat(200))).toBe(false);
    expect(isCacheable("line one\nline two")).toBe(false);
  });

  it("never caches a reading the model was unsure about", () => {
    expect(isCacheable("เอาสิ", { ...clean, confidence: "low" })).toBe(false);
    expect(isCacheable("เอาสิ", { ...clean, notes: "could mean either" })).toBe(false);
  });
});

describe("TranslationCache", () => {
  it("returns what it stored", () => {
    const cache = new TranslationCache();
    cache.set("k", clean);
    expect(cache.get("k")).toEqual(clean);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts least-recently-used entries past the cap", () => {
    const cache = new TranslationCache(2);
    cache.set("a", clean);
    cache.set("b", clean);
    cache.get("a"); // "a" is now the most recent
    cache.set("c", clean);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toEqual(clean);
    expect(cache.get("c")).toEqual(clean);
  });

  it("expires entries after the ttl", () => {
    const cache = new TranslationCache(10, -1);
    cache.set("a", clean);
    expect(cache.get("a")).toBeUndefined();
  });
});
