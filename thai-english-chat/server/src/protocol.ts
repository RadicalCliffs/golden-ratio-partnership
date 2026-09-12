/**
 * Wire protocol shared by the server and the web client.
 *
 * Types only (plus a couple of constants) so the browser bundle can import
 * this file directly from the server workspace without pulling in node deps.
 */

export type Lang = "th" | "en";

/** Thai politeness particles are gendered (ครับ vs ค่ะ), so the translator needs this. */
export type Gender = "male" | "female" | "unspecified";

export type Register = "casual" | "polite" | "formal" | "blunt" | "rude" | "flirty";

export type Confidence = "high" | "medium" | "low";

export interface Member {
  id: string;
  name: string;
  lang: Lang;
  gender: Gender;
  online: boolean;
}

/**
 * A message as one particular reader sees it. The server renders this per
 * viewer: `text` is always already in the viewer's own language.
 */
export interface RenderedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  /** The message in the viewer's language. Empty while a translation is in flight. */
  text: string;
  /** Language of `text`. */
  lang: Lang;
  /** What the sender actually typed, when that differs from `text`. */
  original: string | null;
  originalLang: Lang;
  /**
   * For the sender only: their own message as the other person will read it.
   * Null for the reader (already looking at their own side of it) and while the
   * translation is still running.
   */
  counterpart: string | null;
  /** True when `text` came out of the translator rather than the sender's keyboard. */
  translated: boolean;
  /** Translation still running -- the client shows a placeholder. */
  pending: boolean;
  /** Translation failed; `text` falls back to the original. */
  failed: boolean;
  /** Word-for-word reading, when the natural translation hides a joke or idiom. */
  literal: string | null;
  /** At most one short sentence, in the viewer's language, when context is needed. */
  notes: string | null;
  register: Register | null;
  confidence: Confidence | null;
  /** True when this message is the viewer's own. */
  mine: boolean;
}

export interface RoomGlossaryEntry {
  /** Term as written in the source (a nickname, a company, a dish). */
  term: string;
  /** How it should appear on the other side. */
  as: string;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Client -> server                                                    */
/* ------------------------------------------------------------------ */

export type ClientEvent =
  | {
      type: "join";
      roomId: string;
      name: string;
      lang: Lang;
      gender?: Gender;
      /** Returning members pass the id they were given, to keep their history. */
      memberId?: string;
    }
  | { type: "send"; clientId: string; text: string }
  | { type: "typing"; typing: boolean }
  | { type: "glossary:set"; entries: RoomGlossaryEntry[] }
  | { type: "ping" };

/* ------------------------------------------------------------------ */
/* Server -> client                                                    */
/* ------------------------------------------------------------------ */

export type ServerEvent =
  | {
      type: "joined";
      you: Member;
      roomId: string;
      members: Member[];
      history: RenderedMessage[];
      glossary: RoomGlossaryEntry[];
    }
  /** A new message. `clientId` echoes back so the sender can reconcile its optimistic bubble. */
  | { type: "message"; message: RenderedMessage; clientId?: string }
  /** The translation landed (or failed) for a message the client already has. */
  | { type: "message:update"; message: RenderedMessage }
  | { type: "presence"; members: Member[] }
  | { type: "typing"; memberId: string; typing: boolean }
  | { type: "glossary"; entries: RoomGlossaryEntry[] }
  | { type: "error"; code: ErrorCode; message: string }
  | { type: "pong" };

export type ErrorCode =
  | "bad_request"
  | "not_joined"
  | "room_full"
  | "message_too_long"
  | "rate_limited"
  | "internal";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_MEMBERS_PER_ROOM = 2;
export const HISTORY_LIMIT = 100;
/** How many earlier messages the translator sees, for pronoun/subject recovery. */
export const TRANSLATION_CONTEXT_TURNS = 8;

export function otherLang(lang: Lang): Lang {
  return lang === "th" ? "en" : "th";
}
