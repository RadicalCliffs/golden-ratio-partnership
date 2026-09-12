import { describe, expect, it } from "vitest";
import { renderMessage } from "../render.js";
import type { StoredMember, StoredMessage } from "../store.js";

const ploy: Pick<StoredMember, "id" | "lang"> = { id: "ploy", lang: "th" };
const sam: Pick<StoredMember, "id" | "lang"> = { id: "sam", lang: "en" };

function message(patch: Partial<StoredMessage> = {}): StoredMessage {
  return {
    id: "m1",
    roomId: "ROOM",
    senderId: "ploy",
    senderName: "Ploy",
    sourceLang: "th",
    sourceText: "ไปไหนมา",
    createdAt: 1,
    status: "done",
    targetLang: "en",
    targetText: "where've you been?",
    literal: null,
    notes: null,
    register: "casual",
    confidence: "high",
    ...patch,
  };
}

describe("renderMessage", () => {
  it("gives the English reader only English", () => {
    const rendered = renderMessage(message(), sam);
    expect(rendered.text).toBe("where've you been?");
    expect(rendered.lang).toBe("en");
    expect(rendered.original).toBe("ไปไหนมา");
    expect(rendered.translated).toBe(true);
    expect(rendered.mine).toBe(false);
  });

  it("gives the Thai sender back exactly what she typed", () => {
    const rendered = renderMessage(message(), ploy);
    expect(rendered.text).toBe("ไปไหนมา");
    expect(rendered.lang).toBe("th");
    expect(rendered.mine).toBe(true);
    expect(rendered.translated).toBe(false);
    // ...plus what the other person is reading, once it exists.
    expect(rendered.counterpart).toBe("where've you been?");
  });

  it("holds an empty bubble for the reader while the translation runs", () => {
    const rendered = renderMessage(message({ status: "pending", targetText: null }), sam);
    expect(rendered.pending).toBe(true);
    expect(rendered.text).toBe("");
    // The sender is never blocked on the translation.
    expect(renderMessage(message({ status: "pending", targetText: null }), ploy).text).toBe(
      "ไปไหนมา",
    );
  });

  it("falls back to the original text when translation fails", () => {
    const rendered = renderMessage(message({ status: "failed", targetText: null }), sam);
    expect(rendered.failed).toBe(true);
    expect(rendered.text).toBe("ไปไหนมา");
    expect(rendered.lang).toBe("th");
  });

  it("passes through a message already written in the reader's language", () => {
    const rendered = renderMessage(
      message({ sourceLang: "en", sourceText: "omw", targetText: "omw", targetLang: "en" }),
      sam,
    );
    expect(rendered.text).toBe("omw");
    expect(rendered.translated).toBe(false);
    expect(rendered.original).toBeNull();
  });

  it("keeps translator notes away from the person who wrote the message", () => {
    const withNotes = message({ notes: "she means her brother", literal: "went where came" });
    expect(renderMessage(withNotes, sam).notes).toBe("she means her brother");
    expect(renderMessage(withNotes, ploy).notes).toBeNull();
    expect(renderMessage(withNotes, ploy).literal).toBeNull();
  });
});
