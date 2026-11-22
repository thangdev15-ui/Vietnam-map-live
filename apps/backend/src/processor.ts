import { eventSchema, type LiveEvent } from "../../../packages/shared/index";
import { GameEngine } from "../../../packages/game-engine/index";
import { Store } from "./database";
export class Processor {
  static readonly EVENT_INTERVAL_MS = 450;
  queue: LiveEvent[] = [];
  pending = new Set<string>();
  limits = new Map<string, { start: number; count: number; last: number }>();
  nextEventAt = 0;
  constructor(
    public engine: GameEngine,
    public store: Store,
  ) {}
  enqueue(raw: unknown) {
    const e = eventSchema.parse(raw);
    const key = e.source + ":" + e.id;
    if (
      this.pending.has(key) ||
      this.store.db.prepare("SELECT 1 FROM events WHERE id=?").get(key)
    )
      return "duplicate";
    if (this.queue.length >= 5000) throw Error("Hàng đợi đầy");
    this.pending.add(key);
    this.queue.push(e);
    return "queued";
  }
  drain(now = Date.now(), maximum = 100) {
    for (let n = 0; n < maximum && this.queue.length; n++) {
      const e = this.queue.shift()!;
      const key = e.source + ":" + e.id;
      const uid = e.source + ":" + e.userId;
      let l = this.limits.get(uid);
      if (!l || now - l.start > 60000) {
        l = { start: now, count: 0, last: 0 };
        this.limits.set(uid, l);
      }
      l.count++;
      let result = "";
      const s = this.engine.state.settings;
      this.store.transaction(() => {
        if (l!.count > s.spamLimit) result = "spam";
        else if (e.type === "comment" && now - l!.last < s.cooldown)
          result = "cooldown";
        else {
          if (e.type === "comment") l!.last = now;
          result = this.engine.apply({ ...e, userId: uid });
        }
        this.store.db
          .prepare(
            "INSERT INTO events(id,at,source,type,username,result,details) VALUES(?,?,?,?,?,?,?)",
          )
          .run(
            key,
            now,
            e.source,
            e.type,
            e.username,
            result,
            JSON.stringify({
              text: e.text,
              giftId: e.giftId,
              giftName: e.giftName,
              count: e.count,
            }),
          );
        this.store.set("state", this.engine.state);
      });
      this.pending.delete(key);
    }
    for (const [key, v] of this.limits)
      if (now - v.start > 120000) this.limits.delete(key);
  }
  drainPaced(now = Date.now()) {
    if (!this.queue.length || now < this.nextEventAt) return;
    this.nextEventAt = now + Processor.EVENT_INTERVAL_MS;
    this.drain(now, 1);
  }
}
