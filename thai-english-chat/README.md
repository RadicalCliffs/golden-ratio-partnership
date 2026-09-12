# thai-english-chat

A two-person chat room where one person only ever sees Thai and the other only
ever sees English. Nobody presses a "translate" button, nobody sees the other
language, and neither side has to think about the fact that a translator is
involved — including in the interface chrome, which flips language with you.

```
  Ploy (th)                         server                        Sam (en)
  ─────────                         ──────                        ────────
  "ไปไหนมาเนี่ย 555"  ──send──▶  detect: th
                                 store, broadcast  ──────────▶  · · ·  (translating)
       (her own words,
        shown instantly)          Claude: th → en
                                 store translation ──────────▶  "where've you been lol"
       "they read: …"  ◀──────    broadcast update
```

The Thai side is the hard half, and it is where most of the work went: the
translator is told to produce spoken Bangkok Thai (ภาษาพูด) rather than the
textbook register that machine translation defaults to — particles that match
the speaker (ครับ / ค่ะ / นะ / เหรอ / อ่ะ), the loanwords people actually say
in English, chat shorthand rendered as chat shorthand (555, งง, จริงดิ, ป่ะ),
and pronoun choice carried across as tone because English has no equivalent of
กู/มึง vs ผม/คุณ.

## Quick start

```bash
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY (see below)
npm run dev                 # api on :8787, web on :5173
```

Open http://localhost:5173, create a room, pick **ไทย**, then open the same
room code in another browser profile and pick **English**.

Without an `ANTHROPIC_API_KEY` the server boots in **stub mode**: messages are
passed through with a `[th->en]` marker instead of being translated, which is
enough to work on the UI and the realtime layer without spending anything. The
app says so in a banner rather than letting you wonder why the translations
look wrong.

### Environment

| Variable | Default | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | Unset ⇒ stub mode. |
| `TRANSLATION_MODEL` | `claude-opus-5` | `claude-sonnet-5` is the cheaper option if you are pushing volume. |
| `TRANSLATION_EFFORT` | `low` | How hard the model deliberates per message. Chat wants latency. |
| `PORT` | `8787` | HTTP and WebSocket share it. |
| `DATABASE_PATH` | `./data/chat.sqlite` | `:memory:` keeps nothing between restarts. |
| `CORS_ORIGINS` | `http://localhost:5173` | Only needed while the web dev server is separate. |
| `RATE_LIMIT_PER_MINUTE` | `30` | Per connection. This is your spend guard. |

## How a message travels

1. **Language detection is local.** Script counting decides whether a message
   is Thai or English (`server/src/lang.ts`) — no API call, and it handles the
   normal case of a Bangkok speaker dropping English words into a Thai
   sentence. A message already in the reader's language is delivered as-is.
2. **Nothing blocks on the translator.** The message is stored and broadcast
   immediately: the sender sees their own words at once, the reader sees a
   "translating…" bubble that is patched in place by a `message:update` when
   the translation lands.
3. **The translator gets context.** The previous 8 turns go with every
   request, each in the language it was written in. Thai drops subjects and
   pronouns constantly, so without this the model has to guess who "went"
   anywhere — and it will guess.
4. **Per-room glossary.** Nicknames, places and in-jokes that should always
   render the same way, shared by both people so a name can't come out as
   "Best" on one side and "เบส" on the other.
5. **Structured output.** The model returns `translation`, plus an optional
   `literal` reading when a pun doesn't survive the trip, an optional one-line
   `notes` for something the reader would otherwise misread, and
   `register`/`confidence`. Only the reader sees notes; the writer sees their
   own text and, on request, how it came out.
6. **Failure is visible, not silent.** If translation fails the reader gets
   the original text with a marker, so they can at least paste it somewhere —
   better than a message that never arrives.

### Cost control

- The system prompt is fixed and carries the cache breakpoint, so it is a
  cached prefix on every call; everything volatile (context, glossary, the
  message) lives in the user turn after it.
- Short, self-contained, high-confidence translations are cached in process
  ("ok", "ได้ครับ", "on my way"). Longer or context-dependent lines are
  deliberately **never** cached — serving a stale reading of an ambiguous Thai
  line is worse than paying for the call.
- Emoji, URLs and bare numbers skip the translator entirely. `555` does not,
  because in Thai it means "hahaha".
- `TRANSLATION_EFFORT=low` and the per-connection rate limit cap the rest.

## Layout

```
server/src
  protocol.ts      wire types, shared with the web client (no duplicate copy)
  lang.ts          script-based language detection, neutral-message detection
  translate/       prompt, Claude client, stub translator, output schema
  cache.ts         translation cache + the rules about what is safe to cache
  store.ts         SQLite: rooms, members, messages
  render.ts        one stored message -> what one specific person should see
  realtime.ts      WebSocket hub: join, send, typing, presence, glossary
  http.ts          health, room creation, static hosting of the built client
web/src
  i18n.ts          every UI string in both languages
  lib/useChat.ts   connection, reconnect with backoff, optimistic sends
  components/      join screen, chat view, bubbles, composer, glossary panel
```

`render.ts` is the whole product in one function: the reader never receives the
other language, and the sender never receives a rewritten version of their own
words.

## Tests

```bash
npm test          # 43 tests: detection, prompt, cache, render, and a
                  # two-client WebSocket round trip against a stub translator
npm run typecheck
```

The translator's API contract is covered with an injected fake client (request
shape, refusal handling, transport failure). The tests never call the real API.

## Deploying

```bash
docker build -t thai-english-chat .
docker run -p 8787:8787 -v chatdata:/data -e ANTHROPIC_API_KEY=sk-... thai-english-chat
```

The server hosts the built client, so one container is the whole app. Behind a
proxy, make sure WebSocket upgrades on `/ws` are passed through.

## Limits worth knowing

- **Two people per room.** The rendering model assumes one reader with one
  language; a third person needs a per-viewer fan-out of translations.
- **No accounts and no auth.** Anyone with the room code is in the room. Fine
  for a link you text to one person, not fine for anything sensitive.
- **Messages are stored in plain text** (both languages) in SQLite, and every
  message is sent to the Anthropic API. Say so to your users.
- **Single node.** SQLite plus an in-process cache and an in-process socket
  registry. Horizontal scaling needs Postgres and a pub/sub layer.
- **The translation is a guess about tone.** `confidence: "low"` and the
  `notes` field exist because some Thai lines genuinely cannot be resolved
  without asking. The UI surfaces both rather than hiding them.

## License

MIT.
