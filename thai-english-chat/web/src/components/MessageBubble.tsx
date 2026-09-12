import { useState } from "react";
import type { Lang, RenderedMessage } from "@protocol";
import { strings } from "../i18n";

interface Props {
  message: RenderedMessage;
  viewerLang: Lang;
}

export function MessageBubble({ message, viewerLang }: Props) {
  const [showSource, setShowSource] = useState(false);
  const t = strings(viewerLang);

  const time = new Date(message.createdAt).toLocaleTimeString(
    viewerLang === "th" ? "th-TH" : "en-GB",
    { hour: "2-digit", minute: "2-digit" },
  );

  return (
    <article className={`bubble ${message.mine ? "bubble--mine" : "bubble--theirs"}`}>
      {!message.mine ? <header className="bubble__who">{message.senderName}</header> : null}

      {message.pending ? (
        <p className="bubble__text bubble__text--pending" aria-live="polite">
          <span className="dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {t.translating}
        </p>
      ) : (
        <p className="bubble__text" lang={message.lang}>
          {message.text}
        </p>
      )}

      {message.failed ? <p className="bubble__warn">{t.translationFailed}</p> : null}

      {message.notes ? (
        <p className="bubble__note" lang={viewerLang}>
          {message.notes}
        </p>
      ) : null}

      {message.literal ? (
        <p className="bubble__note">
          <span className="bubble__label">{t.literally}:</span> {message.literal}
        </p>
      ) : null}

      <footer className="bubble__foot">
        <time dateTime={new Date(message.createdAt).toISOString()}>{time}</time>

        {/* The reader can always check what was actually typed, and the writer
            can always check how it came out on the other side. */}
        {message.original ? (
          <button type="button" className="link" onClick={() => setShowSource((v) => !v)}>
            {t.original}
          </button>
        ) : null}
        {message.counterpart ? (
          <button type="button" className="link" onClick={() => setShowSource((v) => !v)}>
            {t.theyRead}
          </button>
        ) : null}
      </footer>

      {showSource && (message.original ?? message.counterpart) ? (
        <p
          className="bubble__source"
          lang={message.original ? message.originalLang : otherOf(message.lang)}
        >
          {message.original ?? message.counterpart}
        </p>
      ) : null}
    </article>
  );
}

function otherOf(lang: Lang): Lang {
  return lang === "th" ? "en" : "th";
}
