import express from "express";
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
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
  const publicState = () => ({
    ...engine.state,
    players: engine.state.players
      .filter((p) => !p.blocked)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((p) => ({ ...p, id: "", history: [] })),
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "128kb" }));
  app.use("/api", rateLimit({ windowMs: 60000, limit: 300 }));
  app.get("/api/state", (_q, r) => r.json(publicState()));
  app.get("/api/map", (_q, r) => r.json(engine.provinces));
  app.get("/api/health", (_q, r) => r.json({ ok: true }));
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
    if (engine.state.phase === "running") {
      r.status(409).json({ error: "Hãy kết thúc trận đang chạy trước" });
      return;
    }
    processor.queue = [];
    processor.pending.clear();
    processor.limits.clear();
    engine.start();
    store.set("state", engine.state);
    r.json({ ok: true });
  });
  app.post("/api/admin/end", (_q, r) => {
    engine.finish();
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
        engine.tick();
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
