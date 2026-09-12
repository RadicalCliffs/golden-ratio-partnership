import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { loadConfig } from "./config.js";
import { createApp } from "./http.js";
import { ChatHub } from "./realtime.js";
import { Store } from "./store.js";
import { createTranslator } from "./translate/index.js";

const config = loadConfig();
const store = new Store(config.databasePath);
const translator = createTranslator(config);
const hub = new ChatHub(store, translator, { rateLimitPerMinute: config.rateLimitPerMinute });

const app = createApp(config, store, translator);
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => hub.handleConnection(ws));
const stopHeartbeat = hub.startHeartbeat();

server.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  if (translator.kind === "stub") {
    console.warn(
      "[server] ANTHROPIC_API_KEY is not set -- running in stub mode. " +
        "Messages are passed through with a [th->en] marker instead of being translated.",
    );
  } else {
    console.log(`[server] translating with ${translator.model} (effort: ${config.translationEffort})`);
  }
});

function shutdown(signal: string): void {
  console.log(`[server] ${signal} received, shutting down`);
  stopHeartbeat();
  wss.clients.forEach((client) => client.close(1001, "server shutting down"));
  server.close(() => {
    store.close();
    process.exit(0);
  });
  // Don't hang forever on a stuck socket.
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
