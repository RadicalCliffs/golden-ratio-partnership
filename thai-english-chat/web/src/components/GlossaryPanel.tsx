import { useState } from "react";
import type { Lang, RoomGlossaryEntry } from "@protocol";
import { strings } from "../i18n";

interface Props {
  lang: Lang;
  entries: RoomGlossaryEntry[];
  onChange: (entries: RoomGlossaryEntry[]) => void;
  onClose: () => void;
}

/**
 * Shared, per-room, and both sides see the same list: a nickname should not
 * come out as "Best" for one person and "เบส" for the other.
 */
export function GlossaryPanel({ lang, entries, onChange, onClose }: Props) {
  const [term, setTerm] = useState("");
  const [as, setAs] = useState("");
  const t = strings(lang);

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!term.trim() || !as.trim()) return;
    onChange([...entries, { term: term.trim(), as: as.trim() }]);
    setTerm("");
    setAs("");
  }

  return (
    <aside className="panel" role="dialog" aria-label={t.glossary}>
      <header className="panel__head">
        <h2>{t.glossary}</h2>
        <button type="button" className="ghost" onClick={onClose}>
          {t.close}
        </button>
      </header>
      <p className="panel__hint">{t.glossaryHint}</p>

      <ul className="glossary">
        {entries.length === 0 ? <li className="glossary__empty">{t.glossaryEmpty}</li> : null}
        {entries.map((entry, index) => (
          <li key={`${entry.term}-${index}`}>
            <span className="glossary__term">{entry.term}</span>
            <span aria-hidden="true">→</span>
            <span className="glossary__as">{entry.as}</span>
            <button
              type="button"
              className="link"
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
              aria-label={`remove ${entry.term}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <form className="glossary__form" onSubmit={add}>
        <label>
          <span>{t.glossaryTerm}</span>
          <input value={term} onChange={(e) => setTerm(e.target.value)} maxLength={80} />
        </label>
        <label>
          <span>{t.glossaryAs}</span>
          <input value={as} onChange={(e) => setAs(e.target.value)} maxLength={80} />
        </label>
        <button type="submit" className="primary">
          {t.glossaryAdd}
        </button>
      </form>
    </aside>
  );
}
