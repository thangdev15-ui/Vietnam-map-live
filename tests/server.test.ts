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
  it("allows only configured Cloudflare Page origins to call the separated API", async () => {
    const previous = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = "https://vietnam-light.pages.dev";
    try {
      const url = await start();
      const allowed = await fetch(url + "/api/health", { headers: { origin: "https://vietnam-light.pages.dev" } });
      const blocked = await fetch(url + "/api/health", { headers: { origin: "https://other.pages.dev" } });
      expect(allowed.headers.get("access-control-allow-origin")).toBe("https://vietnam-light.pages.dev");
      expect(blocked.headers.get("access-control-allow-origin")).toBeNull();
    } finally {
      if (previous === undefined) delete process.env.CORS_ORIGINS;
      else process.env.CORS_ORIGINS = previous;
    }
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
  it("sends one full Socket snapshot, then compact realtime patches", async () => {
    const url = await start();
    server!.engine.start();
    const socket = client(url, { autoConnect: false, transports: ["websocket"] });
    const snapshot = new Promise<State>((resolve) => socket.once("state", resolve));
    socket.connect();
    const initial = await snapshot;
    expect(initial.phase).toBe("running");

    // Let the server issue the required full reset snapshot for the new match.
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const patch = new Promise<Partial<State>>((resolve) => socket.once("statePatch", resolve));
    server!.processor.enqueue(ev("join"));
    const update = await patch;
    expect(update.players?.[0]).toMatchObject({ team: "red", id: "" });
    expect(update.territories).toBeUndefined();
    expect(JSON.stringify(update).length).toBeLessThan(JSON.stringify(initial).length / 2);

    // The previous implementation sent a complete state every 100 ms even idle.
    // After initial sync, no idle frame is sent in this interval.
    let idleSnapshots = 0;
    socket.on("state", () => idleSnapshots++);
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(idleSnapshots).toBe(0);
    const telemetry = await fetch(url + "/api/admin/status", {
      headers: { authorization: "Bearer " + token },
    }).then((response) => response.json()) as { realtime: { snapshots: number; patches: number; bytes: number } };
    expect(telemetry.realtime.snapshots).toBeGreaterThan(0);
    expect(telemetry.realtime.patches).toBeGreaterThan(0);
    expect(telemetry.realtime.bytes).toBeGreaterThan(0);
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
