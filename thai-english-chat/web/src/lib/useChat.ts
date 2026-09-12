import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ClientEvent,
  Gender,
  Lang,
  Member,
  RenderedMessage,
  RoomGlossaryEntry,
  ServerEvent,
} from "@protocol";

export type ConnectionStatus = "idle" | "connecting" | "joined" | "reconnecting" | "error";

export interface Session {
  roomId: string;
  name: string;
  lang: Lang;
  gender: Gender;
  memberId?: string;
}

export interface ChatState {
  status: ConnectionStatus;
  roomId: string;
  me: Member | null;
  members: Member[];
  messages: RenderedMessage[];
  glossary: RoomGlossaryEntry[];
  typingMemberId: string | null;
  errorCode: string | null;
}

const SESSION_KEY = "thai-english-chat.session";
const TYPING_TIMEOUT_MS = 4_000;

function socketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private browsing, quota, etc -- the app still works, it just forgets. */
  }
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    status: "idle",
    roomId: "",
    me: null,
    members: [],
    messages: [],
    glossary: [],
    typingMemberId: null,
    errorCode: null,
  });

  const ws = useRef<WebSocket | null>(null);
  const session = useRef<Session | null>(null);
  const retries = useRef(0);
  const reconnectTimer = useRef<number | null>(null);
  const typingTimer = useRef<number | null>(null);
  const intentionalClose = useRef(false);

  const connect = useCallback(() => {
    const current = session.current;
    if (!current) return;

    setState((s) => ({ ...s, status: retries.current === 0 ? "connecting" : "reconnecting" }));
    intentionalClose.current = false;

    const socket = new WebSocket(socketUrl());
    ws.current = socket;

    socket.addEventListener("open", () => {
      retries.current = 0;
      const join: ClientEvent = {
        type: "join",
        roomId: current.roomId,
        name: current.name,
        lang: current.lang,
        gender: current.gender,
        ...(current.memberId ? { memberId: current.memberId } : {}),
      };
      socket.send(JSON.stringify(join));
    });

    socket.addEventListener("message", (raw) => {
      let event: ServerEvent;
      try {
        event = JSON.parse(String(raw.data)) as ServerEvent;
      } catch {
        return;
      }
      setState((s) => reduce(s, event));

      if (event.type === "joined") {
        session.current = { ...current, memberId: event.you.id };
        saveSession(session.current);
      }
      if (event.type === "typing" && event.typing) {
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => {
          setState((s) => ({ ...s, typingMemberId: null }));
        }, TYPING_TIMEOUT_MS);
      }
    });

    socket.addEventListener("close", () => {
      if (intentionalClose.current || !session.current) return;
      // Exponential backoff, capped -- a phone coming out of a tunnel should
      // not hammer the server.
      const delay = Math.min(1000 * 2 ** retries.current, 15_000);
      retries.current += 1;
      setState((s) => ({ ...s, status: "reconnecting" }));
      reconnectTimer.current = window.setTimeout(connect, delay);
    });
  }, []);

  const join = useCallback(
    (next: Session) => {
      session.current = { ...next, ...(next.memberId ? { memberId: next.memberId } : {}) };
      saveSession(session.current);
      retries.current = 0;
      setState((s) => ({ ...s, messages: [], errorCode: null }));
      connect();
    },
    [connect],
  );

  const leave = useCallback(() => {
    intentionalClose.current = true;
    if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    ws.current?.close();
    ws.current = null;
    session.current = null;
    saveSession(null);
    setState({
      status: "idle",
      roomId: "",
      me: null,
      members: [],
      messages: [],
      glossary: [],
      typingMemberId: null,
      errorCode: null,
    });
  }, []);

  const emit = useCallback((event: ClientEvent) => {
    const socket = ws.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
  }, []);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const me = state.me;
      if (!trimmed || !me) return;
      const clientId = `c${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

      // Optimistic bubble: your own words should never wait on a round trip.
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: `local:${clientId}`,
            roomId: "",
            senderId: me.id,
            senderName: me.name,
            createdAt: Date.now(),
            text: trimmed,
            lang: me.lang,
            original: null,
            counterpart: null,
            originalLang: me.lang,
            translated: false,
            pending: false,
            failed: false,
            literal: null,
            notes: null,
            register: null,
            confidence: null,
            mine: true,
          },
        ],
      }));

      emit({ type: "send", clientId, text: trimmed });
    },
    [emit, state.me],
  );

  const setTyping = useCallback((typing: boolean) => emit({ type: "typing", typing }), [emit]);

  const setGlossary = useCallback(
    (entries: RoomGlossaryEntry[]) => emit({ type: "glossary:set", entries }),
    [emit],
  );

  useEffect(() => {
    return () => {
      intentionalClose.current = true;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      ws.current?.close();
    };
  }, []);

  const other = useMemo(
    () => state.members.find((m) => m.id !== state.me?.id) ?? null,
    [state.members, state.me],
  );

  return { ...state, other, join, leave, send, setTyping, setGlossary };
}

function reduce(state: ChatState, event: ServerEvent): ChatState {
  switch (event.type) {
    case "joined":
      return {
        ...state,
        status: "joined",
        roomId: event.roomId,
        me: event.you,
        members: event.members,
        messages: event.history,
        glossary: event.glossary,
        errorCode: null,
      };

    case "message": {
      // Replace the optimistic bubble if this is the echo of our own send.
      const withoutLocal = event.clientId
        ? state.messages.filter((m) => m.id !== `local:${event.clientId}`)
        : state.messages;
      if (withoutLocal.some((m) => m.id === event.message.id)) return state;
      return { ...state, messages: [...withoutLocal, event.message] };
    }

    case "message:update":
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === event.message.id ? event.message : m)),
      };

    case "presence":
      return { ...state, members: event.members };

    case "typing":
      return { ...state, typingMemberId: event.typing ? event.memberId : null };

    case "glossary":
      return { ...state, glossary: event.entries };

    case "error":
      return { ...state, errorCode: event.code };

    default:
      return state;
  }
}
