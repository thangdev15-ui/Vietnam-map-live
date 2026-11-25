import express from "express";
import { createServer } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import {
  defaults,
  settingsSchema,
  eventSchema,
  type Province,
  type State,
  type Territory,
  type Player,
  type Effect,
} from "../../../packages/shared/index";
import { GameEngine } from "../../../packages/game-engine/index";
import { TikTokAdapter } from "../../../packages/tiktok-connector/index";
import { Store } from "./database";
import { Processor } from "./processor";
import { EdgeSpeechCache } from "./edge-tts";

type TtsJob = {
  audio?: Buffer;
  error?: string;
  expiresAt: number;
  pending?: Promise<Buffer>;
};
export function createApp(token: string, dbPath: string) {
  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const acceptsOrigin = (origin?: string) => !origin || allowedOrigins.size === 0 || allowedOrigins.has(origin);
  const store = new Store(dbPath);
  const rawSettings = store.get<Record<string, unknown>>("settings");
  // Previous releases stored the geographic asset as `map`. Keep their game
  // settings, but migrate them to the first visual battlefield automatically.
  if (rawSettings && (rawSettings.map === "historical63" || rawSettings.map === "merged34")) {
    rawSettings.map = "war-room";
    rawSettings.activeMaps = ["war-room", "cyber-grid"];
  }
  // Map 3 has no approved viewing design yet. Preserve the enum for old
  // records, but only expose the two completed Vietnam viewing modes.
  if (rawSettings) {
    if (rawSettings.map === "imperial-atlas") rawSettings.map = "war-room";
    if (Array.isArray(rawSettings.activeMaps))
      rawSettings.activeMaps = rawSettings.activeMaps.filter((map) => map === "war-room" || map === "cyber-grid");
    if (!Array.isArray(rawSettings.activeMaps) || rawSettings.activeMaps.length === 0)
      rawSettings.activeMaps = ["war-room", "cyber-grid"];
  }
  const settings = settingsSchema.parse(rawSettings ?? defaults);
  const load = () =>
    JSON.parse(
      readFileSync(resolve("assets/maps", "historical63.json"), "utf8"),
    ) as Province[];
  let engine = new GameEngine(load(), settings);
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
  const io = new Server(http, {
    maxHttpBufferSize: 16384,
    perMessageDeflate: { threshold: 1024 },
    cors: { origin: (origin, done) => done(null, acceptsOrigin(origin)), credentials: false },
  });
  const speech = new EdgeSpeechCache();
  const ttsJobs = new Map<string, TtsJob>();
  type PublicState = Omit<State, "players" | "voting"> & {
    players: Player[];
    voting?: Omit<NonNullable<State["voting"]>, "voterIds">;
  };
  type StatePatch = Pick<PublicState, "phase" | "endsAt" | "pausedRemaining" | "winner" | "processed" | "chestsUnlocked" | "voting"> & {
    settings?: PublicState["settings"];
    territories?: Territory[];
    players?: Player[];
    feed?: string[];
    effects?: Effect[];
  };
  const publicState = (): PublicState => {
    const voting = engine.state.voting
      ? {
          endsAt: engine.state.voting.endsAt,
          resultEndsAt: engine.state.voting.resultEndsAt,
          candidates: engine.state.voting.candidates,
          winner: engine.state.voting.winner,
        }
      : undefined;
    return {
      ...engine.state,
      // The broadcast only renders the latest few feed entries. Capping it here
      // keeps both first-sync and delta frames bounded as a live runs longer.
      feed: engine.state.feed.slice(0, 8),
      voting,
      players: engine.state.players
        .filter((p) => !p.blocked)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((p) => ({ ...p, id: "", history: [] })),
    };
  };
  const outbound = { snapshots: 0, patches: 0, bytes: 0, recipients: 0, lastAt: 0 };
  const serializeState = (state: PublicState) => JSON.stringify(state);
  const cloneState = (state: PublicState) => JSON.parse(serializeState(state)) as PublicState;
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const statePatch = (before: PublicState, after: PublicState): StatePatch | null | undefined => {
    // A new match starts with a distinct object graph; a full snapshot avoids
    // applying a delta from the previous match to its new territories.
    if (before.matchId !== after.matchId) return null;
    const changedTerritories = after.territories.filter((territory) => {
      const old = before.territories.find((item) => item.id === territory.id);
      return !same(old, territory);
    });
    const newEffects = after.effects.filter((effect) => !before.effects.some((old) => old.id === effect.id));
    const patch: StatePatch = {
      phase: after.phase,
      endsAt: after.endsAt,
      pausedRemaining: after.pausedRemaining,
      winner: after.winner,
      processed: after.processed,
      chestsUnlocked: after.chestsUnlocked,
      voting: after.voting,
    };
    if (!same(before.settings, after.settings)) patch.settings = after.settings;
    if (changedTerritories.length) patch.territories = changedTerritories;
    if (!same(before.players, after.players)) patch.players = after.players;
    if (!same(before.feed, after.feed)) patch.feed = after.feed;
    if (newEffects.length) patch.effects = newEffects;
    return same(before, after) ? undefined : patch;
  };
  const recordFrame = (kind: "snapshot" | "patch", payload: unknown, recipients: number) => {
    outbound[kind === "snapshot" ? "snapshots" : "patches"]++;
    // Approximate pre-compression outgoing payload. Socket.IO's wire framing and
    // WebSocket compression are not exposed by the library, but this makes
    // regressions visible and scales the measurement by actual live viewers.
    outbound.bytes += Buffer.byteLength(JSON.stringify(payload)) * recipients;
    outbound.recipients += recipients;
    outbound.lastAt = Date.now();
  };
  const emitSnapshot = (socket?: Socket) => {
    const snapshot = publicState();
    const bytes = Buffer.byteLength(serializeState(snapshot));
    // WebSocket compression is independent from Express HTTP compression. It
    // removes repeated JSON keys from these realtime frames.
    if (socket) socket.compress(bytes >= 1024).emit("state", snapshot);
    else io.compress(bytes >= 1024).emit("state", snapshot);
    recordFrame("snapshot", snapshot, socket ? 1 : io.engine.clientsCount);
    return cloneState(snapshot);
  };
  let lastBroadcastState = cloneState(publicState());
  let nextStateSyncAt = 0;
  const syncState = (forceSnapshot = false) => {
    const now = Date.now();
    if (!forceSnapshot && now < nextStateSyncAt) return;
    nextStateSyncAt = now + 500;
    if (forceSnapshot) {
      lastBroadcastState = emitSnapshot();
      return;
    }
    const next = cloneState(publicState());
    const patch = statePatch(lastBroadcastState, next);
    if (patch === undefined) return;
    if (patch === null) {
      lastBroadcastState = emitSnapshot();
      return;
    }
    io.compress(Buffer.byteLength(JSON.stringify(patch)) >= 1024).emit("statePatch", patch);
    recordFrame("patch", patch, io.engine.clientsCount);
    lastBroadcastState = next;
  };
  const activateMap = (map: typeof settings.map) => {
    const banned = engine.state.players.filter((player) => player.blocked);
    const selectedSettings = { ...engine.state.settings, map };
    engine = new GameEngine(load(), selectedSettings);
    engine.state.players = banned;
    processor.engine = engine;
    engine.start();
    store.set("state", engine.state);
    io.emit("mapChanged");
    syncState(true);
  };
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use((q, r, next) => {
    const origin = q.headers.origin;
    if (origin && acceptsOrigin(origin)) {
      r.set("Access-Control-Allow-Origin", origin);
      r.set("Vary", "Origin");
      r.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      r.set("Access-Control-Allow-Headers", "Authorization,Content-Type");
    }
    if (q.method === "OPTIONS") return r.sendStatus(204);
    next();
  });
  // Render bills every byte sent to viewers. Text assets compress well; live
  // socket frames and MP3 should stay untouched to avoid latency/CPU waste.
  app.use(compression({
    threshold: 1024,
    filter: (request, response) =>
      !request.path.startsWith("/socket.io") &&
      !response.getHeader("Content-Type")?.toString().startsWith("audio/") &&
      compression.filter(request, response),
  }));
  app.use(express.json({ limit: "128kb" }));
  app.use("/api", rateLimit({ windowMs: 60000, limit: 300 }));
  app.get("/api/state", (_q, r) => r.json(publicState()));
  app.get("/api/map", (_q, r) => r.json(engine.provinces));
  app.get("/api/health", (_q, r) => r.json({ ok: true }));
  const ttsLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: true, legacyHeaders: false });
  app.post("/api/tts", ttsLimit, async (q, r) => {
    const { text } = z.object({ text: z.string().trim().min(3).max(180) }).parse(q.body);
    const { pending } = speech.synthesize(text);
    const id = randomUUID();
    const job: TtsJob = { expiresAt: Date.now() + 180_000, pending };
    ttsJobs.set(id, job);
    void pending.then((audio) => { job.audio = audio; }).catch((error: unknown) => {
      console.error("Edge TTS failed", error);
      job.error = "Không tạo được lời đọc MC";
    });
    r.status(202).json({ id, provider: "edge-tts" });
  });
  app.get("/api/tts/:id", async (q, r) => {
    const job = ttsJobs.get(q.params.id);
    if (!job || job.expiresAt < Date.now()) {
      ttsJobs.delete(q.params.id);
      r.status(404).json({ error: "Không còn yêu cầu giọng đọc" });
      return;
    }
    if (job.error) {
      ttsJobs.delete(q.params.id);
      r.status(502).json({ error: job.error });
      return;
    }
    if (!job.audio) {
      r.status(202).json({ pending: true });
      return;
    }
    ttsJobs.delete(q.params.id);
    r.set("Cache-Control", "private, max-age=3600");
    r.type("audio/mpeg").send(job.audio);
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
      realtime: { ...outbound, connected: io.engine.clientsCount },
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
    const { map } = z.object({ map: z.enum(["war-room", "cyber-grid", "imperial-atlas"]) }).parse(q.body);
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
  app.post("/api/admin/super-light", (q, r) => {
    const { province, power } = z.object({ province: z.string().min(1).max(100), power: z.number().min(1).max(100000).optional() }).parse(q.body);
    const result = engine.triggerSuperLight(province, power);
    if (result !== "super") return r.status(409).json({ error: result });
    store.set("state", engine.state);
    r.json({ ok: true });
  });
  app.post("/api/admin/vfx", (q, r) => {
    const body = z.object({
      province: z.string().min(1).max(100),
      kind: z.enum(["meteor", "lightning", "vortex", "starfall"]),
      vfx: z.object({
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        intensity: z.number().min(0.2).max(1.5).optional(),
        duration: z.number().int().min(600).max(9000).optional(),
        density: z.number().min(0.15).max(1.5).optional(),
      }).optional(),
    }).parse(q.body);
    const result = engine.triggerVisualEffect(body.province, body.kind, body.vfx);
    if (result !== "vfx") return r.status(404).json({ error: result });
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
    engine = new GameEngine(load(), s);
    engine.state.players = banned;
    processor.engine = engine;
    store.set("settings", s);
    store.set("state", engine.state);
    io.emit("mapChanged");
    syncState(true);
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
  const clientDir = resolve("dist/client");
  // Vite adds a content hash to every generated asset. Cache those forever:
  // a new deploy has new filenames, so this cannot serve stale JS/CSS.
  app.use("/assets", express.static(resolve(clientDir, "assets"), {
    immutable: true,
    maxAge: "365d",
  }));
  // Do not cache HTML. It must point viewers at the latest hashed assets.
  app.use(express.static(clientDir, { index: false, maxAge: 0 }));
  app.get("*", (_q, r) => {
    r.set("Cache-Control", "no-cache");
    r.sendFile(resolve(clientDir, "index.html"));
  });
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
  io.on("connection", (socket) => {
    emitSnapshot(socket);
  });
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
      syncState();
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
