import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Confidence, Gender, Lang, Register, RoomGlossaryEntry } from "./protocol.js";

export type MessageStatus = "pending" | "done" | "failed";

export interface StoredMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  sourceLang: Lang;
  sourceText: string;
  createdAt: number;
  status: MessageStatus;
  targetLang: Lang;
  targetText: string | null;
  literal: string | null;
  notes: string | null;
  register: Register | null;
  confidence: Confidence | null;
}

export interface StoredMember {
  id: string;
  roomId: string;
  name: string;
  lang: Lang;
  gender: Gender;
  lastSeen: number;
}

export interface StoredRoom {
  id: string;
  createdAt: number;
  glossary: RoomGlossaryEntry[];
  glossaryVersion: number;
}

interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  source_lang: string;
  source_text: string;
  created_at: number;
  status: string;
  target_lang: string;
  target_text: string | null;
  literal: string | null;
  notes: string | null;
  register: string | null;
  confidence: string | null;
}

interface MemberRow {
  id: string;
  room_id: string;
  name: string;
  lang: string;
  gender: string;
  last_seen: number;
}

interface RoomRow {
  id: string;
  created_at: number;
  glossary: string;
  glossary_version: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  glossary TEXT NOT NULL DEFAULT '[]',
  glossary_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  name TEXT NOT NULL,
  lang TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'unspecified',
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS members_room_idx ON members(room_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  source_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  target_text TEXT,
  literal TEXT,
  notes TEXT,
  register TEXT,
  confidence TEXT
);
CREATE INDEX IF NOT EXISTS messages_room_idx ON messages(room_id, created_at);
`;

export class Store {
  private readonly db: Database.Database;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  /* ---------------------------------------------------------------- rooms */

  ensureRoom(roomId: string): StoredRoom {
    this.db
      .prepare("INSERT OR IGNORE INTO rooms (id, created_at) VALUES (?, ?)")
      .run(roomId, Date.now());
    return this.getRoom(roomId)!;
  }

  getRoom(roomId: string): StoredRoom | undefined {
    const row = this.db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as
      | RoomRow
      | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      createdAt: row.created_at,
      glossary: safeParseGlossary(row.glossary),
      glossaryVersion: row.glossary_version,
    };
  }

  setGlossary(roomId: string, entries: RoomGlossaryEntry[]): StoredRoom {
    this.ensureRoom(roomId);
    this.db
      .prepare(
        "UPDATE rooms SET glossary = ?, glossary_version = glossary_version + 1 WHERE id = ?",
      )
      .run(JSON.stringify(entries), roomId);
    return this.getRoom(roomId)!;
  }

  /* -------------------------------------------------------------- members */

  upsertMember(member: Omit<StoredMember, "lastSeen">): StoredMember {
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO members (id, room_id, name, lang, gender, last_seen)
         VALUES (@id, @room_id, @name, @lang, @gender, @last_seen)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           lang = excluded.lang,
           gender = excluded.gender,
           last_seen = excluded.last_seen`,
      )
      .run({
        id: member.id,
        room_id: member.roomId,
        name: member.name,
        lang: member.lang,
        gender: member.gender,
        last_seen: now,
      });
    return { ...member, lastSeen: now };
  }

  getMember(memberId: string): StoredMember | undefined {
    const row = this.db.prepare("SELECT * FROM members WHERE id = ?").get(memberId) as
      | MemberRow
      | undefined;
    return row ? toMember(row) : undefined;
  }

  getMembers(roomId: string): StoredMember[] {
    const rows = this.db
      .prepare("SELECT * FROM members WHERE room_id = ? ORDER BY last_seen ASC")
      .all(roomId) as MemberRow[];
    return rows.map(toMember);
  }

  /* ------------------------------------------------------------- messages */

  insertMessage(message: StoredMessage): StoredMessage {
    this.db
      .prepare(
        `INSERT INTO messages
          (id, room_id, sender_id, sender_name, source_lang, source_text, created_at,
           status, target_lang, target_text, literal, notes, register, confidence)
         VALUES
          (@id, @room_id, @sender_id, @sender_name, @source_lang, @source_text, @created_at,
           @status, @target_lang, @target_text, @literal, @notes, @register, @confidence)`,
      )
      .run({
        id: message.id,
        room_id: message.roomId,
        sender_id: message.senderId,
        sender_name: message.senderName,
        source_lang: message.sourceLang,
        source_text: message.sourceText,
        created_at: message.createdAt,
        status: message.status,
        target_lang: message.targetLang,
        target_text: message.targetText,
        literal: message.literal,
        notes: message.notes,
        register: message.register,
        confidence: message.confidence,
      });
    return message;
  }

  updateTranslation(
    id: string,
    patch: Pick<
      StoredMessage,
      "status" | "targetText" | "literal" | "notes" | "register" | "confidence"
    >,
  ): StoredMessage | undefined {
    this.db
      .prepare(
        `UPDATE messages
            SET status = @status, target_text = @target_text, literal = @literal,
                notes = @notes, register = @register, confidence = @confidence
          WHERE id = @id`,
      )
      .run({
        id,
        status: patch.status,
        target_text: patch.targetText,
        literal: patch.literal,
        notes: patch.notes,
        register: patch.register,
        confidence: patch.confidence,
      });
    return this.getMessage(id);
  }

  getMessage(id: string): StoredMessage | undefined {
    const row = this.db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as
      | MessageRow
      | undefined;
    return row ? toMessage(row) : undefined;
  }

  /** Most recent `limit` messages, oldest first. */
  recentMessages(roomId: string, limit: number): StoredMessage[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
      )
      .all(roomId, limit) as MessageRow[];
    return rows.reverse().map(toMessage);
  }
}

function toMessage(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    sourceLang: row.source_lang as Lang,
    sourceText: row.source_text,
    createdAt: row.created_at,
    status: row.status as MessageStatus,
    targetLang: row.target_lang as Lang,
    targetText: row.target_text,
    literal: row.literal,
    notes: row.notes,
    register: row.register as Register | null,
    confidence: row.confidence as Confidence | null,
  };
}

function toMember(row: MemberRow): StoredMember {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    lang: row.lang as Lang,
    gender: row.gender as Gender,
    lastSeen: row.last_seen,
  };
}

function safeParseGlossary(raw: string): RoomGlossaryEntry[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RoomGlossaryEntry =>
        !!e && typeof e === "object" && typeof (e as RoomGlossaryEntry).term === "string",
    );
  } catch {
    return [];
  }
}
