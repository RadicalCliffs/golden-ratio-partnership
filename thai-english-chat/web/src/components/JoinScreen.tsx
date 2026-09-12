import { useEffect, useState } from "react";
import type { Gender, Lang } from "@protocol";
import { strings } from "../i18n";
import type { Session } from "../lib/useChat";

interface Props {
  initial: Session | null;
  errorCode: string | null;
  onJoin: (session: Session) => void;
}

function browserLang(): Lang {
  return navigator.language?.toLowerCase().startsWith("th") ? "th" : "en";
}

function roomFromUrl(): string {
  return new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "";
}

export function JoinScreen({ initial, errorCode, onJoin }: Props) {
  const [lang, setLang] = useState<Lang>(initial?.lang ?? browserLang());
  const [name, setName] = useState(initial?.name ?? "");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "unspecified");
  const [roomId, setRoomId] = useState(roomFromUrl() || initial?.roomId || "");
  const [creating, setCreating] = useState(false);
  const t = strings(lang);

  // The whole screen flips language the moment you pick a side.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  async function createRoom() {
    setCreating(true);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const body = (await res.json()) as { roomId: string };
      setRoomId(body.roomId);
    } catch {
      /* the user can still type a code by hand */
    } finally {
      setCreating(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const code = roomId.trim().toUpperCase();
    if (!name.trim() || !code) return;
    onJoin({
      roomId: code,
      name: name.trim(),
      lang,
      gender,
      ...(initial?.memberId && initial.roomId === code ? { memberId: initial.memberId } : {}),
    });
  }

  return (
    <main className="join" data-lang={lang}>
      <form className="card join__card" onSubmit={submit}>
        <h1 className="join__title">
          <span lang="th">สวัสดี</span>
          <span aria-hidden="true"> / </span>
          <span lang="en">Hello</span>
        </h1>
        <p className="join__tagline">{t.tagline}</p>

        <fieldset className="field">
          <legend>{t.youWrite}</legend>
          <div className="segmented">
            <button
              type="button"
              className={lang === "th" ? "is-active" : ""}
              onClick={() => setLang("th")}
            >
              ไทย
            </button>
            <button
              type="button"
              className={lang === "en" ? "is-active" : ""}
              onClick={() => setLang("en")}
            >
              English
            </button>
          </div>
        </fieldset>

        <label className="field">
          <span>{t.yourName}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.yourNamePlaceholder}
            maxLength={40}
            autoComplete="nickname"
            required
          />
        </label>

        <fieldset className="field">
          <legend>{t.particles}</legend>
          <div className="segmented">
            {(["male", "female", "unspecified"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={gender === value ? "is-active" : ""}
                onClick={() => setGender(value)}
              >
                {t[value]}
              </button>
            ))}
          </div>
          <small>{t.particlesHint}</small>
        </fieldset>

        <label className="field">
          <span>{t.roomCode}</span>
          <div className="row">
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder={t.roomCodePlaceholder}
              maxLength={24}
              className="mono"
              required
            />
            <button type="button" className="ghost" onClick={createRoom} disabled={creating}>
              {t.createRoom}
            </button>
          </div>
        </label>

        {errorCode ? <p className="error">{errorText(errorCode, lang)}</p> : null}

        <button type="submit" className="primary">
          {t.join}
        </button>
      </form>
    </main>
  );
}

function errorText(code: string, lang: Lang): string {
  const t = strings(lang);
  if (code === "room_full") return t.errorRoomFull;
  return t.errorGeneric;
}
