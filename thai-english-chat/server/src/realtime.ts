import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { detectLang, isLanguageNeutral } from "./lang.js";
import {
  HISTORY_LIMIT,
  MAX_MEMBERS_PER_ROOM,
  MAX_MESSAGE_LENGTH,
  TRANSLATION_CONTEXT_TURNS,
  otherLang,
} from "./protocol.js";
import type {
  ClientEvent,
  ErrorCode,
  Gender,
  Lang,
  Member,
  RoomGlossaryEntry,
  ServerEvent,
} from "./protocol.js";
import { renderMessage } from "./render.js";
import { cacheKey, isCacheable, TranslationCache } from "./cache.js";
import type { Store, StoredMember, StoredMessage } from "./store.js";
import type { ContextTurn, Translator } from "./translate/index.js";

interface Conn {
  ws: WebSocket;
  memberId?: string;
  roomId?: string;
  alive: boolean;
  /** Token bucket, refilled continuously -- the spend guard on the API. */
  tokens: number;
  lastRefill: number;
}

export interface HubOptions {
  rateLimitPerMinute: number;
  /** Tests await this to know a translation round finished. */
  onTranslationSettled?: (messageId: string, ok: boolean) => void;
}

export class ChatHub {
  private readonly conns = new Set<Conn>();
  private readonly byRoom = new Map<string, Set<Conn>>();
  private readonly cache = new TranslationCache();

  constructor(
    private readonly store: Store,
    private readonly translator: Translator,
    private readonly options: HubOptions,
  ) {}

  handleConnection(ws: WebSocket): void {
    const conn: Conn = {
      ws,
      alive: true,
      tokens: this.options.rateLimitPerMinute,
      lastRefill: Date.now(),
    };
    this.conns.add(conn);

    ws.on("pong", () => {
      conn.alive = true;
    });

    ws.on("message", (raw: Buffer | string) => {
      let event: ClientEvent;
      try {
        event = JSON.parse(raw.toString()) as ClientEvent;
      } catch {
        this.sendError(conn, "bad_request", "message was not valid JSON");
        return;
      }
      void this.handleEvent(conn, event).catch((err: unknown) => {
        console.error("[hub] event failed", err);
        this.sendError(conn, "internal", "something went wrong handling that");
      });
    });

    ws.on("close", () => {
      this.conns.delete(conn);
      if (conn.roomId) {
        this.byRoom.get(conn.roomId)?.delete(conn);
        this.broadcastPresence(conn.roomId);
      }
    });

    ws.on("error", (err: unknown) => console.error("[hub] socket error", err));
  }

  /** Drops sockets that stopped answering pings (phones going to sleep, mostly). */
  startHeartbeat(intervalMs = 30_000): () => void {
    const timer = setInterval(() => {
      for (const conn of this.conns) {
        if (!conn.alive) {
          conn.ws.terminate();
          continue;
        }
        conn.alive = false;
        try {
          conn.ws.ping();
        } catch {
          conn.ws.terminate();
        }
      }
    }, intervalMs);
    timer.unref?.();
    return () => clearInterval(timer);
  }

  /* ----------------------------------------------------------- dispatch */

  private async handleEvent(conn: Conn, event: ClientEvent): Promise<void> {
    switch (event?.type) {
      case "join":
        this.handleJoin(conn, event);
        return;
      case "send":
        await this.handleSend(conn, event);
        return;
      case "typing":
        this.handleTyping(conn, event.typing);
        return;
      case "glossary:set":
        this.handleGlossary(conn, event.entries);
        return;
      case "ping":
        this.send(conn, { type: "pong" });
        return;
      default:
        this.sendError(conn, "bad_request", "unknown event type");
    }
  }

  private handleJoin(conn: Conn, event: Extract<ClientEvent, { type: "join" }>): void {
    const roomId = normalizeRoomId(event.roomId);
    const name = (event.name ?? "").trim().slice(0, 40);
    const lang: Lang = event.lang === "th" ? "th" : "en";
    const gender: Gender = isGender(event.gender) ? event.gender : "unspecified";

    if (!roomId) {
      this.sendError(conn, "bad_request", "a room code is required");
      return;
    }
    if (!name) {
      this.sendError(conn, "bad_request", "a name is required");
      return;
    }

    this.store.ensureRoom(roomId);
    const existing = this.store.getMembers(roomId);
    const returning = event.memberId
      ? existing.find((m) => m.id === event.memberId)
      : undefined;

    if (!returning && existing.length >= MAX_MEMBERS_PER_ROOM) {
      this.sendError(conn, "room_full", "this room already has two people in it");
      return;
    }

    const member = this.store.upsertMember({
      id: returning?.id ?? event.memberId ?? randomUUID(),
      roomId,
      name,
      lang,
      gender,
    });

    // One socket per member: a reconnect or a second tab replaces the old one.
    for (const other of this.byRoom.get(roomId) ?? []) {
      if (other !== conn && other.memberId === member.id) {
        other.ws.close(4000, "replaced by a newer connection");
      }
    }

    conn.memberId = member.id;
    conn.roomId = roomId;
    let set = this.byRoom.get(roomId);
    if (!set) {
      set = new Set();
      this.byRoom.set(roomId, set);
    }
    set.add(conn);

    const room = this.store.ensureRoom(roomId);
    const history = this.store
      .recentMessages(roomId, HISTORY_LIMIT)
      .map((m) => renderMessage(m, member));

    this.send(conn, {
      type: "joined",
      roomId,
      you: this.toMember(member),
      members: this.membersOf(roomId),
      history,
      glossary: room.glossary,
    });
    this.broadcastPresence(roomId);
  }

  private async handleSend(
    conn: Conn,
    event: Extract<ClientEvent, { type: "send" }>,
  ): Promise<void> {
    const member = this.memberOf(conn);
    if (!member) {
      this.sendError(conn, "not_joined", "join a room first");
      return;
    }

    const text = (event.text ?? "").trim();
    if (!text) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      this.sendError(conn, "message_too_long", `messages cap at ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }
    if (!this.takeToken(conn)) {
      this.sendError(conn, "rate_limited", "slow down a moment");
      return;
    }

    const reader = this.store
      .getMembers(member.roomId)
      .find((m) => m.id !== member.id);
    const sourceLang = detectLang(text, member.lang);
    const targetLang: Lang = reader?.lang ?? otherLang(member.lang);
    const needsTranslation = sourceLang !== targetLang && !isLanguageNeutral(text);

    const message: StoredMessage = {
      id: randomUUID(),
      roomId: member.roomId,
      senderId: member.id,
      senderName: member.name,
      sourceLang,
      sourceText: text,
      createdAt: Date.now(),
      status: needsTranslation ? "pending" : "done",
      targetLang,
      targetText: needsTranslation ? null : text,
      literal: null,
      notes: null,
      register: null,
      confidence: null,
    };
    this.store.insertMessage(message);

    this.broadcastMessage(message, event.clientId);

    if (needsTranslation) {
      void this.translateAndBroadcast(message, member, reader);
    }
  }

  private handleTyping(conn: Conn, typing: boolean): void {
    const member = this.memberOf(conn);
    if (!member) return;
    this.broadcast(
      member.roomId,
      { type: "typing", memberId: member.id, typing: Boolean(typing) },
      conn,
    );
  }

  private handleGlossary(conn: Conn, entries: RoomGlossaryEntry[]): void {
    const member = this.memberOf(conn);
    if (!member) {
      this.sendError(conn, "not_joined", "join a room first");
      return;
    }
    const clean = (Array.isArray(entries) ? entries : [])
      .filter((e) => e && typeof e.term === "string" && typeof e.as === "string")
      .slice(0, 50)
      .map((e) => ({
        term: e.term.trim().slice(0, 80),
        as: e.as.trim().slice(0, 80),
        ...(e.note ? { note: String(e.note).trim().slice(0, 140) } : {}),
      }))
      .filter((e) => e.term && e.as);

    const room = this.store.setGlossary(member.roomId, clean);
    this.broadcast(member.roomId, { type: "glossary", entries: room.glossary });
  }

  /* -------------------------------------------------------- translation */

  private async translateAndBroadcast(
    message: StoredMessage,
    writer: StoredMember,
    reader: StoredMember | undefined,
  ): Promise<void> {
    const room = this.store.getRoom(message.roomId);
    const glossaryVersion = room?.glossaryVersion ?? 1;
    const key = cacheKey({
      model: this.translator.model,
      from: message.sourceLang,
      to: message.targetLang,
      text: message.sourceText,
      glossaryVersion,
    });

    let ok = true;
    try {
      const cached = isCacheable(message.sourceText) ? this.cache.get(key) : undefined;
      const result =
        cached ??
        (await this.translator.translate({
          text: message.sourceText,
          from: message.sourceLang,
          to: message.targetLang,
          writer: { name: writer.name, gender: writer.gender },
          reader: { name: reader?.name ?? "the other person" },
          context: this.contextFor(message),
          glossary: room?.glossary ?? [],
        }));

      if (!cached && isCacheable(message.sourceText, result)) this.cache.set(key, result);

      this.store.updateTranslation(message.id, {
        status: "done",
        targetText: result.translation,
        literal: result.literal,
        notes: result.notes,
        register: result.register,
        confidence: result.confidence,
      });
    } catch (err) {
      ok = false;
      console.error("[translate] failed", err);
      this.store.updateTranslation(message.id, {
        status: "failed",
        targetText: null,
        literal: null,
        notes: null,
        register: null,
        confidence: null,
      });
    }

    const updated = this.store.getMessage(message.id);
    if (updated) this.broadcastMessage(updated, undefined, "message:update");
    this.options.onTranslationSettled?.(message.id, ok);
  }

  /**
   * Earlier turns, in the language each was written in. Thai leaves out the
   * subject of most sentences, so without this the translator has to guess who
   * "went" or "said" anything.
   */
  private contextFor(message: StoredMessage): ContextTurn[] {
    return this.store
      .recentMessages(message.roomId, TRANSLATION_CONTEXT_TURNS + 1)
      .filter((m) => m.id !== message.id)
      .slice(-TRANSLATION_CONTEXT_TURNS)
      .map((m) => ({ speaker: m.senderName, lang: m.sourceLang, text: m.sourceText }));
  }

  /* ------------------------------------------------------------ plumbing */

  private broadcastMessage(
    message: StoredMessage,
    clientId?: string,
    type: "message" | "message:update" = "message",
  ): void {
    for (const conn of this.byRoom.get(message.roomId) ?? []) {
      const viewer = this.memberOf(conn);
      if (!viewer) continue;
      const rendered = renderMessage(message, viewer);
      this.send(
        conn,
        type === "message"
          ? {
              type: "message",
              message: rendered,
              ...(clientId && viewer.id === message.senderId ? { clientId } : {}),
            }
          : { type: "message:update", message: rendered },
      );
    }
  }

  private broadcastPresence(roomId: string): void {
    this.broadcast(roomId, { type: "presence", members: this.membersOf(roomId) });
  }

  private broadcast(roomId: string, event: ServerEvent, except?: Conn): void {
    for (const conn of this.byRoom.get(roomId) ?? []) {
      if (conn === except) continue;
      this.send(conn, event);
    }
  }

  private send(conn: Conn, event: ServerEvent): void {
    if (conn.ws.readyState !== conn.ws.OPEN) return;
    conn.ws.send(JSON.stringify(event));
  }

  private sendError(conn: Conn, code: ErrorCode, message: string): void {
    this.send(conn, { type: "error", code, message });
  }

  private membersOf(roomId: string): Member[] {
    const online = new Set(
      [...(this.byRoom.get(roomId) ?? [])].map((c) => c.memberId).filter(Boolean),
    );
    return this.store
      .getMembers(roomId)
      .map((m) => ({ ...this.toMember(m), online: online.has(m.id) }));
  }

  private toMember(member: StoredMember): Member {
    return {
      id: member.id,
      name: member.name,
      lang: member.lang,
      gender: member.gender,
      online: true,
    };
  }

  private memberOf(conn: Conn): StoredMember | undefined {
    if (!conn.memberId) return undefined;
    return this.store.getMember(conn.memberId);
  }

  private takeToken(conn: Conn): boolean {
    const now = Date.now();
    const refill = ((now - conn.lastRefill) / 60_000) * this.options.rateLimitPerMinute;
    conn.tokens = Math.min(this.options.rateLimitPerMinute, conn.tokens + refill);
    conn.lastRefill = now;
    if (conn.tokens < 1) return false;
    conn.tokens -= 1;
    return true;
  }
}

export function normalizeRoomId(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24);
}

function isGender(value: unknown): value is Gender {
  return value === "male" || value === "female" || value === "unspecified";
}
