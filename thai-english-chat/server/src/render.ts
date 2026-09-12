import type { RenderedMessage } from "./protocol.js";
import type { StoredMember, StoredMessage } from "./store.js";

/**
 * Turn a stored message into what one specific person should see.
 *
 * This is the whole product in one function: the reader never receives the
 * other language, and the sender never receives a rewritten version of their
 * own words. Everything else in the app just moves these objects around.
 */
export function renderMessage(
  message: StoredMessage,
  viewer: Pick<StoredMember, "id" | "lang">,
): RenderedMessage {
  const base = {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    senderName: message.senderName,
    createdAt: message.createdAt,
    originalLang: message.sourceLang,
  };

  // The sender sees exactly what they typed, plus -- once it lands -- the
  // version the other person is reading.
  if (viewer.id === message.senderId) {
    return {
      ...base,
      text: message.sourceText,
      lang: message.sourceLang,
      original: null,
      counterpart: message.status === "done" ? message.targetText : null,
      translated: false,
      pending: message.status === "pending",
      failed: message.status === "failed",
      literal: null,
      notes: null,
      register: null,
      confidence: null,
      mine: true,
    };
  }

  // The other person wrote it in the language this viewer already reads
  // (someone code-switched, or the text was language-neutral).
  if (message.sourceLang === viewer.lang) {
    return {
      ...base,
      text: message.sourceText,
      lang: viewer.lang,
      original: null,
      counterpart: null,
      translated: false,
      pending: false,
      failed: false,
      literal: null,
      notes: null,
      register: null,
      confidence: null,
      mine: false,
    };
  }

  if (message.status === "pending") {
    return {
      ...base,
      text: "",
      lang: viewer.lang,
      original: null,
      counterpart: null,
      translated: true,
      pending: true,
      failed: false,
      literal: null,
      notes: null,
      register: null,
      confidence: null,
      mine: false,
    };
  }

  // Translation failed: show the original rather than a blank bubble, and let
  // the client say so. A message the other person can copy into a translator
  // beats a message that silently never arrives.
  if (message.status === "failed" || message.targetText === null) {
    return {
      ...base,
      text: message.sourceText,
      lang: message.sourceLang,
      original: null,
      counterpart: null,
      translated: false,
      pending: false,
      failed: true,
      literal: null,
      notes: null,
      register: null,
      confidence: null,
      mine: false,
    };
  }

  return {
    ...base,
    text: message.targetText,
    lang: viewer.lang,
    original: message.sourceText,
    counterpart: null,
    translated: true,
    pending: false,
    failed: false,
    literal: message.literal,
    notes: message.notes,
    register: message.register,
    confidence: message.confidence,
    mine: false,
  };
}
