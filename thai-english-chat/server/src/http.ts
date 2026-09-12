import express from "express";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "./config.js";
import { normalizeRoomId } from "./realtime.js";
import type { Store } from "./store.js";
import type { Translator } from "./translate/index.js";

/** No O/0/I/1 -- room codes get read out loud over the phone. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomId(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function createApp(config: Config, store: Store, translator: Translator) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      translator: translator.kind,
      model: translator.model,
      // Worth surfacing: in stub mode nothing is actually being translated.
      stub: translator.kind === "stub",
    });
  });

  app.post("/api/rooms", (_req, res) => {
    let roomId = generateRoomId();
    // Collisions are rare but free to avoid.
    for (let i = 0; i < 5 && store.getRoom(roomId); i += 1) roomId = generateRoomId();
    store.ensureRoom(roomId);
    res.status(201).json({ roomId });
  });

  app.get("/api/rooms/:roomId", (req, res) => {
    const roomId = normalizeRoomId(req.params.roomId);
    const room = store.getRoom(roomId);
    if (!room) {
      res.status(404).json({ error: "no such room" });
      return;
    }
    res.json({
      roomId: room.id,
      createdAt: room.createdAt,
      members: store.getMembers(roomId).map((m) => ({ id: m.id, name: m.name, lang: m.lang })),
    });
  });

  const webDist = resolveWebDist(config);
  if (webDist) {
    app.use(express.static(webDist, { maxAge: "1h", index: false }));
    app.get("*", (_req, res) => res.sendFile(join(webDist, "index.html")));
  }

  return app;
}

function resolveWebDist(config: Config): string | undefined {
  const candidates = [
    config.webDist,
    // server/dist/http.js -> ../../../web/dist
    resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist"),
    resolve(process.cwd(), "web/dist"),
  ].filter((p): p is string => Boolean(p));

  return candidates.find((p) => existsSync(join(p, "index.html")));
}
