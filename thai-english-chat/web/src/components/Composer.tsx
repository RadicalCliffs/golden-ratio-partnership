import { useRef, useState } from "react";
import type { Lang } from "@protocol";
import { MAX_MESSAGE_LENGTH } from "@protocol";
import { strings } from "../i18n";

interface Props {
  lang: Lang;
  disabled: boolean;
  onSend: (text: string) => void;
  onTyping: (typing: boolean) => void;
}

export function Composer({ lang, disabled, onSend, onTyping }: Props) {
  const [text, setText] = useState("");
  const lastTypingPing = useRef(0);
  const t = strings(lang);

  function submit() {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
    onTyping(false);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
    // One typing ping per second is plenty; the other side keeps it lit for 4s.
    const now = Date.now();
    if (now - lastTypingPing.current > 1000) {
      lastTypingPing.current = now;
      onTyping(event.target.value.length > 0);
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={text}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t.composerPlaceholder}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={1}
        lang={lang}
        disabled={disabled}
        aria-label={t.composerPlaceholder}
      />
      <button type="submit" className="primary" disabled={disabled || text.trim().length === 0}>
        {t.send}
      </button>
    </form>
  );
}
