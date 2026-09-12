import { useEffect, useRef, useState } from "react";
import type { Lang, Member, RenderedMessage, RoomGlossaryEntry } from "@protocol";
import { strings } from "../i18n";
import type { ConnectionStatus } from "../lib/useChat";
import { Composer } from "./Composer";
import { GlossaryPanel } from "./GlossaryPanel";
import { MessageBubble } from "./MessageBubble";

interface Props {
  roomId: string;
  me: Member;
  other: Member | null;
  status: ConnectionStatus;
  messages: RenderedMessage[];
  glossary: RoomGlossaryEntry[];
  typingMemberId: string | null;
  errorCode: string | null;
  stubMode: boolean;
  onSend: (text: string) => void;
  onTyping: (typing: boolean) => void;
  onGlossary: (entries: RoomGlossaryEntry[]) => void;
  onLeave: () => void;
}

export function ChatView(props: Props) {
  const { me, other, messages, typingMemberId, status } = props;
  const t = strings(me.lang);
  const [showGlossary, setShowGlossary] = useState(false);
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = me.lang;
  }, [me.lang]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingMemberId]);

  async function copyInvite() {
    const url = `${window.location.origin}/?room=${props.roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked -- the code is on screen anyway */
    }
  }

  return (
    <div className="chat" data-lang={me.lang}>
      <header className="chat__head">
        <div className="chat__room">
          <span className="chat__label">{t.room}</span>
          <code>{props.roomId}</code>
          <button type="button" className="link" onClick={copyInvite}>
            {copied ? t.copied : t.copy}
          </button>
        </div>

        <div className="chat__peer">
          {other ? (
            <>
              <span className={`dot ${other.online ? "dot--on" : ""}`} aria-hidden="true" />
              <span>{other.name}</span>
              {!other.online ? <span className="muted">{t.otherOffline}</span> : null}
            </>
          ) : (
            <span className="muted">{t.waitingForOther}</span>
          )}
        </div>

        <div className="chat__actions">
          <button type="button" className="ghost" onClick={() => setShowGlossary(true)}>
            {t.glossary}
          </button>
          <button type="button" className="ghost" onClick={props.onLeave}>
            {t.leave}
          </button>
        </div>
      </header>

      {props.stubMode ? <p className="banner">{t.stubBanner}</p> : null}
      {status === "reconnecting" ? <p className="banner">{t.reconnecting}</p> : null}
      {props.errorCode ? <p className="banner banner--error">{errorText(props.errorCode, me.lang)}</p> : null}

      <main className="chat__log">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} viewerLang={me.lang} />
        ))}
        {typingMemberId && typingMemberId !== me.id && other ? (
          <p className="typing">{t.isTyping(other.name)}</p>
        ) : null}
        <div ref={endRef} />
      </main>

      <Composer
        lang={me.lang}
        disabled={status !== "joined"}
        onSend={props.onSend}
        onTyping={props.onTyping}
      />

      {showGlossary ? (
        <GlossaryPanel
          lang={me.lang}
          entries={props.glossary}
          onChange={props.onGlossary}
          onClose={() => setShowGlossary(false)}
        />
      ) : null}
    </div>
  );
}

function errorText(code: string, lang: Lang): string {
  const t = strings(lang);
  switch (code) {
    case "rate_limited":
      return t.errorRateLimited;
    case "message_too_long":
      return t.errorTooLong;
    case "room_full":
      return t.errorRoomFull;
    default:
      return t.errorGeneric;
  }
}
