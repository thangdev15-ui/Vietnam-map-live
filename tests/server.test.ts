import { describe, it, expect, afterEach } from "vitest";
import { io as client } from "socket.io-client";
import { createApp } from "../apps/backend/src/server";
import type { State } from "../packages/shared/index";
const token = "test-token-with-32-characters-long";
let server: ReturnType<typeof createApp> | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});
async function start() {
  server = createApp(token, ":memory:");
  await new Promise<void>((r) => server!.http.listen(0, "127.0.0.1", r));
  const addr = server.http.address() as { port: number };
  return "http://127.0.0.1:" + addr.port;
}
const ev = (id: string, userId = id, text = "đỏ") => ({
  id,
  source: "demo",
  type: "comment",
  userId,
  username: userId,
  text,
  count: 1,
});
describe("Server integration", () => {
  it("queues free Edge narration without requiring a provider API key", async () => {
    const url = await start();
    const response = await fetch(url + "/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Thắng đã thắp sáng Hà Nội" }),
    });
    expect(response.status).toBe(202);
    expect((await response.json()).provider).toBe("edge-tts");
  });
  it("authenticates admin, validates settings, denies spoofed live source", async () => {
    const url = await start();
    expect((await fetch(url + "/api/admin/status")).status).toBe(401);
    const post = (path: string, body: unknown) =>
      fetch(url + "/api/admin/" + path, {
        method: "POST",
        headers: {
          authorization: "Bearer " + token,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    expect((await post("settings", {})).status).toBe(400);
    expect(
      (await post("events", [{ ...ev("a"), source: "tiktok" }])).status,
    ).toBe(400);
    expect((await post("start", {})).ok).toBe(true);
    expect((await post("start", {})).status).toBe(409);
  });
  it("connects, synchronizes authoritative state, reconnects and disconnects Socket.IO", async () => {
    const url = await start();
    const socket = client(url, {
      autoConnect: false,
      transports: ["websocket"],
    });
    const next = () => new Promise<State>((r) => socket.once("state", r));
    let promise = next();
    socket.connect();
    expect((await promise).phase).toBe("waiting");
    server!.engine.start();
    server!.processor.enqueue(ev("join"));
    promise = next();
    const state = await promise;
    expect(state.players[0].team).toBe("red");
    expect(state.players[0].id).toBe("");
    socket.disconnect();
    expect(socket.connected).toBe(false);
    promise = next();
    socket.connect();
    expect((await promise).players.length).toBe(1);
    socket.disconnect();
  });
  it("deduplicates queued and persisted events, enforces cooldown", async () => {
    await start();
    server!.engine.start();
    const p = server!.processor;
    expect(p.enqueue(ev("one", "u"))).toBe("queued");
    expect(p.enqueue(ev("one", "u"))).toBe("duplicate");
    p.drain(100000);
    expect(p.enqueue(ev("one", "u"))).toBe("duplicate");
    p.enqueue(ev("two", "u", "đánh hà nội"));
    p.drain(100001);
    expect(server!.store.logs()).toEqual(
      expect.arrayContaining([expect.objectContaining({ result: "cooldown" })]),
    );
  });
  it("requires admin auth and triggers super light through the real API", async () => {
    const url = await start();
    server!.engine.start();
    expect((await fetch(url + "/api/admin/super-light", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ province: "ha-noi" }),
    })).status).toBe(401);
    const response = await fetch(url + "/api/admin/super-light", {
      method: "POST",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify({ province: "ha-noi", power: 100 }),
    });
    expect(response.ok).toBe(true);
    expect(server!.engine.state.effects.some((effect) => effect.kind === "super")).toBe(true);
  });
  it("requires admin auth and adds a VFX-only event through the API", async () => {
    const url = await start();
    const before = structuredClone(server!.engine.state.territories);
    expect((await fetch(url + "/api/admin/vfx", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ province: "ha-noi", kind: "meteor" }),
    })).status).toBe(401);
    const response = await fetch(url + "/api/admin/vfx", {
      method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify({ province: "ha-noi", kind: "meteor", vfx: { color: "#ffcc33", intensity: 1, duration: 3400, density: .8 } }),
    });
    expect(response.ok).toBe(true);
    expect(server!.engine.state.territories).toEqual(before);
    expect(server!.engine.state.effects.at(-1)).toMatchObject({ province: "ha-noi", kind: "meteor" });
  });
  it("processes 1000 distinct viewers without event loss", async () => {
    await start();
    server!.engine.start();
    for (let i = 0; i < 1000; i++) server!.processor.enqueue(ev("load-" + i));
    for (let i = 0; i < 10; i++) server!.processor.drain();
    expect(server!.engine.state.players.length).toBe(1000);
    expect(server!.engine.state.processed).toBe(1000);
    expect(server!.processor.pending.size).toBe(0);
  }, 15000);
  it("loads 63 genuine geometries", async () => {
    const url = await start();
    const map = await (await fetch(url + "/api/map")).json();
    expect(map.length).toBe(63);
    expect(
      map.every((p: { polygons: unknown[] }) => p.polygons.length > 0),
    ).toBe(true);
  });
});
