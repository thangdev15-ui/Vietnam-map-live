import express from "express";
import { createServer } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { z } from "zod";
import {
  defaults,
  settingsSchema,
  eventSchema,
  type Province,
  type State,
} from "../../../packages/shared/index";
import { GameEngine } from "../../../packages/game-engine/index";
import { TikTokAdapter } from "../../../packages/tiktok-connector/index";
import { Store } from "./database";
import { Processor } from "./processor";
export function createApp(token: string, dbPath: string) {
  const store = new Store(dbPath);
  const settings = settingsSchema.parse(store.get("settings") ?? defaults);
  const load = (name: string) =>
    JSON.parse(
      readFileSync(resolve("assets/maps", name + ".json"), "utf8"),
    ) as Province[];
  let engine = new GameEngine(load(settings.map), settings);
  const saved = store.get<State>("state");
  if (saved && saved.settings.map === settings.map) {
    engine.state = saved;
    engine.state.settings = settings;
    if (saved.phase === "running" && saved.endsAt <= Date.now())
      engine.finish();
  }
  const processor = new Processor(engine, store);
  const adapter = new TikTokAdapter((e) => processor.enqueue(e));
  const app = express();
  const http = createServer(app);
  const io = new Server(http, { maxHttpBufferSize: 16384 });
  const ttsJobs = new Map<string, { url: string; expiresAt: number }>();
  const publicState = () => ({
    ...engine.state,
    voting: engine.state.voting
      ? { ...engine.state.voting, voterIds: [] }
      : undefined,
    players: engine.state.players
      .filter((p) => !p.blocked)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((p) => ({ ...p, id: "", history: [] })),
  });
  const activateMap = (map: typeof settings.map) => {
    const banned = engine.state.players.filter((player) => player.blocked);
    const selectedSettings = { ...engine.state.settings, map };
    engine = new GameEngine(load(map), selectedSettings);
    engine.state.players = banned;
    processor.engine = engine;
    engine.start();
    store.set("state", engine.state);
    io.emit("mapChanged");
  };
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "128kb" }));
  app.use("/api", rateLimit({ windowMs: 60000, limit: 300 }));
  app.get("/api/state", (_q, r) => r.json(publicState()));
  app.get("/api/map", (_q, r) => r.json(engine.provinces));
  app.get("/api/health", (_q, r) => r.json({ ok: true }));
  const ttsLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: true, legacyHeaders: false });
  app.post("/api/tts", ttsLimit, async (q, r) => {
    const { text } = z.object({ text: z.string().trim().min(3).max(180) }).parse(q.body);
    const apiKey = process.env.FPT_TTS_API_KEY;
    if (!apiKey) {
      r.status(503).json({ error: "Chưa cấu hình FPT.AI TTS" });
      return;
    }
    try {
      const response = await fetch("https://api.fpt.ai/hmi/tts/v5", {
        method: "POST",
        headers: {
          api_key: apiKey,
          voice: process.env.FPT_TTS_VOICE ?? "banmai",
          speed: process.env.FPT_TTS_SPEED ?? "0",
          format: "mp3",
          "content-type": "text/plain; charset=utf-8",
        },
        body: text,
      });
      const result = (await response.json()) as { async?: string; error?: number; message?: string };
      if (!response.ok || result.error || !result.async) {
        console.error("FPT TTS failed", response.status, result.message);
        r.status(502).json({
          error: "FPT.AI không nhận được yêu cầu đọc",
          providerStatus: response.status,
          providerMessage: result.message?.slice(0, 300),
        });
        return;
      }
      const id = randomUUID();
      ttsJobs.set(id, { url: result.async, expiresAt: Date.now() + 180_000 });
      r.status(202).json({ id });
    } catch (error) {
      console.error("FPT TTS request failed", error);
      r.status(502).json({ error: "Không kết nối được FPT.AI" });
    }
  });
  app.get("/api/tts/:id", async (q, r) => {
    const job = ttsJobs.get(q.params.id);
    if (!job || job.expiresAt < Date.now()) {
      ttsJobs.delete(q.params.id);
      r.status(404).json({ error: "Không còn yêu cầu giọng đọc" });
      return;
    }
    try {
      const audio = await fetch(job.url);
      if (!audio.ok) {
        r.status(202).json({ pending: true });
        return;
      }
      ttsJobs.delete(q.params.id);
      r.set("Cache-Control", "no-store");
      r.type("audio/mpeg").send(Buffer.from(await audio.arrayBuffer()));
    } catch {
      r.status(202).json({ pending: true });
    }
  });
  app.use("/api/admin", (q, r, next) => {
    const got = Buffer.from(
      q.headers.authorization?.replace(/^Bearer /, "") ?? "",
    );
    const want = Buffer.from(token);
    if (got.length !== want.length || !timingSafeEqual(got, want)) {
      r.status(401).json({ error: "Token quản trị không hợp lệ" });
      return;
    }
    next();
  });
  app.get("/api/admin/status", (_q, r) =>
    r.json({
      tiktok: adapter.status,
      players: engine.state.players,
      logs: store.logs(),
      queue: processor.queue.length,
      matches: store.db
        .prepare("SELECT id,at,state FROM matches ORDER BY at DESC LIMIT 20")
        .all(),
    }),
  );
  app.post("/api/admin/start", (_q, r) => {
    const result = engine.beginVoting();
    if (result !== "voting") {
      r.status(409).json({ error: result });
      return;
    }
    processor.queue = [];
    processor.pending.clear();
    processor.limits.clear();
    store.set("state", engine.state);
    r.json({ ok: true });
  });
  app.post("/api/admin/choose-map", (q, r) => {
    const { map } = z.object({ map: z.enum(["historical63", "merged34"]) }).parse(q.body);
    const result = engine.chooseMap(map);
    if (result !== "vote_result") {
      r.status(409).json({ error: result });
      return;
    }
    store.set("state", engine.state);
    r.json({ ok: true });
  });
  app.post("/api/admin/close-vote", (_q, r) => {
    const result = engine.finishVoting();
    if (!['vote_result', 'voting_tie', 'vote_empty'].includes(result)) {
      r.status(409).json({ error: result });
      return;
    }
    store.set("state", engine.state);
    r.json({ ok: true, result });
  });
  app.post("/api/admin/end", (_q, r) => {
    engine.finish();
    store.set("state", engine.state);
    r.json({ ok: true });
  });
  app.post("/api/admin/pause", (_q, r) => {
    const result = engine.pause();
    if (result !== "paused") return r.status(409).json({ error: result });
    store.set("state", engine.state);
    r.json({ ok: true });
  });
  app.post("/api/admin/resume", (_q, r) => {
    const result = engine.resume();
    if (result !== "running") return r.status(409).json({ error: result });
    store.set("state", engine.state);
    r.json({ ok: true });
  });
  app.post("/api/admin/settings", (q, r) => {
    if (engine.state.phase === "running") {
      r.status(409).json({ error: "Kết thúc trận trước khi thay đổi luật" });
      return;
    }
    const s = settingsSchema.parse(q.body);
    const banned = engine.state.players.filter((p) => p.blocked);
    engine = new GameEngine(load(s.map), s);
    engine.state.players = banned;
    processor.engine = engine;
    store.set("settings", s);
    store.set("state", engine.state);
    io.emit("mapChanged");
    r.json(s);
  });
  app.post("/api/admin/events", (q, r) => {
    const events = z
      .array(eventSchema.extend({ source: z.literal("demo") }))
      .min(1)
      .max(1000)
      .parse(q.body);
    if (processor.queue.length + events.length > 5000) {
      r.status(429).json({ error: "Hàng đợi đầy" });
      return;
    }
    r.json(events.map((e) => processor.enqueue(e)));
  });
  app.post("/api/admin/block", (q, r) => {
    const b = z.object({ id: z.string(), blocked: z.boolean() }).parse(q.body);
    const p = engine.state.players.find((p) => p.id === b.id);
    if (!p) {
      r.status(404).json({ error: "Không thấy người chơi" });
      return;
    }
    p.blocked = b.blocked;
    store.set("state", engine.state);
    r.json({ ok: true });
  });
  app.post("/api/admin/connect", (q, r) => {
    const { username } = z
      .object({ username: z.string().regex(/^@?[A-Za-z0-9_.]{1,50}$/) })
      .parse(q.body);
    void adapter.connect(username.replace(/^@/, ""));
    r.json({ ok: true });
  });
  app.post("/api/admin/disconnect", (_q, r) => {
    adapter.disconnect();
    r.json({ ok: true });
  });
  app.use(express.static(resolve("dist/client")));
  app.get("*", (_q, r) => r.sendFile(resolve("dist/client/index.html")));
  app.use(
    (
      error: Error,
      _q: express.Request,
      r: express.Response,
      _next: express.NextFunction,
    ) => {
      r.status(error instanceof z.ZodError ? 400 : 500).json({
        error:
          error instanceof z.ZodError
            ? error.issues.map((i) => i.message).join("; ")
            : "Không xử lý được yêu cầu",
      });
    },
  );
  io.on("connection", (socket) => socket.emit("state", publicState()));
  let lastTick = Date.now();
  const interval = setInterval(() => {
    try {
      processor.drainPaced();
      if (Date.now() - lastTick >= 1000) {
        const selectedMap = engine.tick();
        if (selectedMap) activateMap(selectedMap);
        lastTick = Date.now();
        store.set("state", engine.state);
      }
      if (engine.state.phase === "ended")
        store.db
          .prepare("INSERT OR IGNORE INTO matches VALUES(?,?,?)")
          .run(engine.state.matchId, Date.now(), JSON.stringify(engine.state));
      io.emit("state", publicState());
    } catch (error) {
      console.error("Game loop error", error);
    }
  }, 100);
  return {
    app,
    http,
    io,
    store,
    processor,
    get engine() {
      return engine;
    },
    close: async () => {
      clearInterval(interval);
      adapter.disconnect();
      store.set("state", engine.state);
      await new Promise<void>((res) => io.close(() => res()));
      store.db.close();
    },
  };
}
