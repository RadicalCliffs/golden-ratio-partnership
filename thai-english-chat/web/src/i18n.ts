import type { Lang } from "@protocol";

/**
 * The point of the app is that neither person sees the other's language --
 * which has to include the buttons, the placeholders and the error messages,
 * not just the message bubbles.
 */
export interface Strings {
  tagline: string;
  yourName: string;
  yourNamePlaceholder: string;
  youWrite: string;
  thai: string;
  english: string;
  particles: string;
  particlesHint: string;
  male: string;
  female: string;
  unspecified: string;
  roomCode: string;
  roomCodePlaceholder: string;
  createRoom: string;
  join: string;
  joining: string;
  room: string;
  copy: string;
  copied: string;
  leave: string;
  waitingForOther: string;
  otherOffline: string;
  translating: string;
  translationFailed: string;
  original: string;
  theyRead: string;
  literally: string;
  isTyping: (name: string) => string;
  composerPlaceholder: string;
  send: string;
  reconnecting: string;
  offline: string;
  stubBanner: string;
  glossary: string;
  glossaryHint: string;
  glossaryTerm: string;
  glossaryAs: string;
  glossaryAdd: string;
  glossaryEmpty: string;
  close: string;
  errorRoomFull: string;
  errorRateLimited: string;
  errorTooLong: string;
  errorGeneric: string;
}

const en: Strings = {
  tagline: "Two languages, one conversation.",
  yourName: "Your name",
  yourNamePlaceholder: "Sam",
  youWrite: "You read and write",
  thai: "Thai",
  english: "English",
  particles: "Thai politeness particles",
  particlesHint: "Thai ends sentences differently depending on who is speaking.",
  male: "male (ครับ)",
  female: "female (ค่ะ)",
  unspecified: "neither",
  roomCode: "Room code",
  roomCodePlaceholder: "ABC123",
  createRoom: "Create a new room",
  join: "Join",
  joining: "Joining...",
  room: "Room",
  copy: "Copy",
  copied: "Copied",
  leave: "Leave",
  waitingForOther: "Waiting for the other person to join.",
  otherOffline: "is offline",
  translating: "translating...",
  translationFailed: "Couldn't translate this one. Original below.",
  original: "original",
  theyRead: "they read",
  literally: "literally",
  isTyping: (name) => `${name} is typing...`,
  composerPlaceholder: "Write in English...",
  send: "Send",
  reconnecting: "Reconnecting...",
  offline: "Offline",
  stubBanner: "Demo mode: no API key on the server, so nothing is really being translated.",
  glossary: "Names & terms",
  glossaryHint: "Nicknames, places and in-jokes the translator should always render the same way.",
  glossaryTerm: "As written",
  glossaryAs: "Should read",
  glossaryAdd: "Add",
  glossaryEmpty: "Nothing yet.",
  close: "Close",
  errorRoomFull: "That room already has two people in it.",
  errorRateLimited: "Slow down a moment.",
  errorTooLong: "That message is too long.",
  errorGeneric: "Something went wrong.",
};

const th: Strings = {
  tagline: "คนละภาษา แต่คุยกันรู้เรื่อง",
  yourName: "ชื่อของคุณ",
  yourNamePlaceholder: "พลอย",
  youWrite: "คุณอ่านและพิมพ์ภาษา",
  thai: "ไทย",
  english: "อังกฤษ",
  particles: "คำลงท้าย",
  particlesHint: "ใช้เลือกว่าจะแปลให้อีกฝ่ายลงท้ายว่า ครับ หรือ ค่ะ",
  male: "ผู้ชาย (ครับ)",
  female: "ผู้หญิง (ค่ะ)",
  unspecified: "ไม่ระบุ",
  roomCode: "รหัสห้อง",
  roomCodePlaceholder: "ABC123",
  createRoom: "สร้างห้องใหม่",
  join: "เข้าห้อง",
  joining: "กำลังเข้าห้อง...",
  room: "ห้อง",
  copy: "คัดลอก",
  copied: "คัดลอกแล้ว",
  leave: "ออกจากห้อง",
  waitingForOther: "รออีกฝ่ายเข้าห้อง",
  otherOffline: "ออฟไลน์อยู่",
  translating: "กำลังแปล...",
  translationFailed: "แปลข้อความนี้ไม่สำเร็จ ด้านล่างคือต้นฉบับ",
  original: "ต้นฉบับ",
  theyRead: "อีกฝ่ายเห็นว่า",
  literally: "แปลตรงตัว",
  isTyping: (name) => `${name} กำลังพิมพ์...`,
  composerPlaceholder: "พิมพ์ภาษาไทยได้เลย...",
  send: "ส่ง",
  reconnecting: "กำลังเชื่อมต่อใหม่...",
  offline: "ออฟไลน์",
  stubBanner: "โหมดทดลอง: เซิร์ฟเวอร์ยังไม่มี API key ข้อความจึงยังไม่ได้ถูกแปลจริง",
  glossary: "ชื่อและคำเฉพาะ",
  glossaryHint: "ชื่อเล่น สถานที่ หรือคำที่อยากให้แปลเหมือนเดิมทุกครั้ง",
  glossaryTerm: "คำที่พิมพ์",
  glossaryAs: "ให้แปลว่า",
  glossaryAdd: "เพิ่ม",
  glossaryEmpty: "ยังไม่มี",
  close: "ปิด",
  errorRoomFull: "ห้องนี้มีคนอยู่ครบสองคนแล้ว",
  errorRateLimited: "ส่งเร็วเกินไป รอสักครู่นะ",
  errorTooLong: "ข้อความยาวเกินไป",
  errorGeneric: "เกิดข้อผิดพลาดบางอย่าง",
};

export const STRINGS: Record<Lang, Strings> = { en, th };

export function strings(lang: Lang): Strings {
  return STRINGS[lang];
}
