import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestServer, TestClient, type TestHarness } from "./helpers.js";

let harness: TestHarness;
const clients: TestClient[] = [];

async function join(
  name: string,
  lang: "th" | "en",
  roomId = "ROOM01",
  memberId?: string,
) {
  const client = await TestClient.connect(harness.url);
  clients.push(client);
  client.send({ type: "join", roomId, name, lang, ...(memberId ? { memberId } : {}) });
  await client.next("joined");
  return client;
}

beforeEach(async () => {
  harness = await startTestServer();
});

afterEach(async () => {
  clients.splice(0).forEach((c) => c.close());
  await harness.close();
});

describe("two-person room", () => {
  it("delivers Thai to the Thai speaker and English to the English speaker", async () => {
    const ploy = await join("Ploy", "th");
    const sam = await join("Sam", "en");

    ploy.send({ type: "send", clientId: "c1", text: "ไปไหนมา" });

    // Sam gets a placeholder immediately -- the room does not freeze while the
    // translation runs.
    const pending = await sam.next("message");
    expect(pending.message.pending).toBe(true);
    expect(pending.message.text).toBe("");

    // Ploy sees her own words, untouched, right away.
    const mine = await ploy.next("message", (e) => e.message.mine);
    expect(mine.message.text).toBe("ไปไหนมา");
    expect(mine.clientId).toBe("c1");

    const landed = await sam.next("message:update");
    expect(landed.message.pending).toBe(false);
    expect(landed.message.translated).toBe(true);
    expect(landed.message.lang).toBe("en");
    // StubTranslator marks rather than translates.
    expect(landed.message.text).toBe("[th->en] ไปไหนมา");
    expect(landed.message.original).toBe("ไปไหนมา");
  });

  it("shows the sender how their message reads on the other side", async () => {
    const ploy = await join("Ploy", "th");
    await join("Sam", "en");

    ploy.send({ type: "send", clientId: "c1", text: "ไปไหนมา" });
    const update = await ploy.next("message:update", (e) => e.message.mine);
    expect(update.message.text).toBe("ไปไหนมา");
    expect(update.message.counterpart).toBe("[th->en] ไปไหนมา");
  });

  it("does not translate a message already in the reader's language", async () => {
    const ploy = await join("Ploy", "th");
    const sam = await join("Sam", "en");

    // A Thai speaker code-switching into English.
    ploy.send({ type: "send", clientId: "c1", text: "on my way, 10 minutes" });
    const received = await sam.next("message");
    expect(received.message.pending).toBe(false);
    expect(received.message.translated).toBe(false);
    expect(received.message.text).toBe("on my way, 10 minutes");
  });

  it("skips the translator for emoji-only messages", async () => {
    const ploy = await join("Ploy", "th");
    const sam = await join("Sam", "en");

    ploy.send({ type: "send", clientId: "c1", text: "👍👍" });
    const received = await sam.next("message");
    expect(received.message.pending).toBe(false);
    expect(received.message.text).toBe("👍👍");
  });

  it("replays history in the joiner's own language", async () => {
    const ploy = await join("Ploy", "th");
    const ployId = (await ploy.next("joined")).you.id;
    ploy.send({ type: "send", clientId: "c1", text: "ถึงยัง" });
    await harness.waitForTranslation();

    const sam = await join("Sam", "en");
    const joined = await sam.next("joined");
    expect(joined.history).toHaveLength(1);
    expect(joined.history[0]!.text).toBe("[th->en] ถึงยัง");
    expect(joined.history[0]!.lang).toBe("en");

    // Ploy reconnects with the id she was given -- her own history is still
    // hers, in Thai, and she does not count as a third person.
    const ployAgain = await join("Ploy", "th", "ROOM01", ployId);
    const rejoined = await ployAgain.next("joined");
    expect(rejoined.history[0]!.text).toBe("ถึงยัง");
  });

  it("relays typing and presence", async () => {
    const ploy = await join("Ploy", "th");
    const sam = await join("Sam", "en");

    const presence = await ploy.next("presence", (e) => e.members.length === 2);
    expect(presence.members.every((m) => m.online)).toBe(true);

    ploy.send({ type: "typing", typing: true });
    const typing = await sam.next("typing");
    expect(typing.typing).toBe(true);
    expect(typing.memberId).toBe(presence.members.find((m) => m.name === "Ploy")!.id);
  });

  it("turns away a third person", async () => {
    await join("Ploy", "th");
    await join("Sam", "en");

    const gate = await TestClient.connect(harness.url);
    clients.push(gate);
    gate.send({ type: "join", roomId: "ROOM01", name: "Nueng", lang: "th" });
    const error = await gate.next("error");
    expect(error.code).toBe("room_full");
  });

  it("rejects messages from a socket that never joined", async () => {
    const stray = await TestClient.connect(harness.url);
    clients.push(stray);
    stray.send({ type: "send", clientId: "c1", text: "hello" });
    expect((await stray.next("error")).code).toBe("not_joined");
  });

  it("stores a shared glossary and tells both sides", async () => {
    const ploy = await join("Ploy", "th");
    const sam = await join("Sam", "en");

    ploy.send({ type: "glossary:set", entries: [{ term: "พี่เบส", as: "Best" }] });
    const broadcast = await sam.next("glossary");
    expect(broadcast.entries).toEqual([{ term: "พี่เบส", as: "Best" }]);
    expect(harness.store.getRoom("ROOM01")!.glossaryVersion).toBe(2);
  });
});
