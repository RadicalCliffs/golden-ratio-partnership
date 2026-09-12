import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import { ChatHub } from "../realtime.js";
import { Store } from "../store.js";
import { StubTranslator } from "../translate/index.js";
import type { ClientEvent, ServerEvent } from "../protocol.js";

export interface TestHarness {
  url: string;
  store: Store;
  hub: ChatHub;
  /** Resolves once the translation for `messageId` has been stored and broadcast. */
  waitForTranslation(messageId?: string): Promise<string>;
  close(): Promise<void>;
}

export async function startTestServer(): Promise<TestHarness> {
  const store = new Store(":memory:");
  const settled: string[] = [];
  const waiters: ((id: string) => void)[] = [];

  const hub = new ChatHub(store, new StubTranslator(), {
    rateLimitPerMinute: 120,
    onTranslationSettled: (id) => {
      settled.push(id);
      waiters.splice(0).forEach((resolve) => resolve(id));
    },
  });

  const server: Server = createServer();
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => hub.handleConnection(ws));

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `ws://127.0.0.1:${port}/ws`,
    store,
    hub,
    waitForTranslation(messageId?: string) {
      if (messageId && settled.includes(messageId)) return Promise.resolve(messageId);
      if (!messageId && settled.length > 0) return Promise.resolve(settled[settled.length - 1]!);
      return new Promise<string>((resolve) => waiters.push(resolve));
    },
    async close() {
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
      store.close();
    },
  };
}

/** A tiny client that records every server event, so tests can await one. */
export class TestClient {
  readonly events: ServerEvent[] = [];
  private readonly ws: WebSocket;
  private readonly waiters: { match: (e: ServerEvent) => boolean; resolve: (e: never) => void }[] =
    [];

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on("message", (raw: Buffer) => {
      const event = JSON.parse(raw.toString()) as ServerEvent;
      this.events.push(event);
      for (let i = this.waiters.length - 1; i >= 0; i -= 1) {
        const waiter = this.waiters[i]!;
        if (waiter.match(event)) {
          this.waiters.splice(i, 1);
          (waiter.resolve as (e: ServerEvent) => void)(event);
        }
      }
    });
  }

  static async connect(url: string): Promise<TestClient> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    return new TestClient(ws);
  }

  send(event: ClientEvent): void {
    this.ws.send(JSON.stringify(event));
  }

  /** Waits for the next matching event, or the first already-received one. */
  next<T extends ServerEvent["type"]>(
    type: T,
    predicate: (event: Extract<ServerEvent, { type: T }>) => boolean = () => true,
  ): Promise<Extract<ServerEvent, { type: T }>> {
    const match = (event: ServerEvent): boolean =>
      event.type === type && predicate(event as Extract<ServerEvent, { type: T }>);

    const existing = this.events.find(match);
    if (existing) return Promise.resolve(existing as Extract<ServerEvent, { type: T }>);

    return new Promise((resolve) => {
      this.waiters.push({ match, resolve: resolve as (e: never) => void });
    });
  }

  close(): void {
    this.ws.close();
  }
}
