import { it, expect, vi, afterEach, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
const mock = vi.hoisted(() => ({ instances: [] as any[], fail: false }));
vi.mock("tiktok-live-connector", () => ({
  TikTokLiveConnection: class extends EventEmitter {
    constructor() {
      super();
      mock.instances.push(this);
    }
    async connect() {
      if (mock.fail) throw Error("offline");
    }
    disconnect() {}
  },
  WebcastEvent: {
    CHAT: "chat",
    GIFT: "gift",
    LIKE: "like",
    FOLLOW: "follow",
    SHARE: "share",
    STREAM_END: "streamEnd",
  },
  ControlEvent: { ERROR: "error", DISCONNECTED: "disconnected" },
}));
import { TikTokAdapter } from "../packages/tiktok-connector/index";
const originalSigningKey = process.env.TIKTOK_SIGN_API_KEY;
beforeEach(() => {
  process.env.TIKTOK_SIGN_API_KEY = "test-signing-key";
});
afterEach(() => {
  vi.useRealTimers();
  mock.instances = [];
  mock.fail = false;
  if (originalSigningKey === undefined) delete process.env.TIKTOK_SIGN_API_KEY;
  else process.env.TIKTOK_SIGN_API_KEY = originalSigningKey;
});
it("connects, emits normalized events, counts completed gift streak once and disconnects", async () => {
  const emit = vi.fn();
  const a = new TikTokAdapter(emit);
  await a.connect("test");
  expect(a.status.state).toBe("connected");
  const c = mock.instances[0];
  c.emit("gift", {
    msgId: "1",
    user: { userId: "u", uniqueId: "name" },
    giftDetails: { giftType: 1, giftName: "Rose" },
    repeatEnd: false,
    repeatCount: 2,
  });
  expect(emit).not.toHaveBeenCalled();
  c.emit("gift", {
    msgId: "2",
    user: { userId: "u", uniqueId: "name" },
    giftDetails: { giftType: 1, giftName: "Rose" },
    repeatEnd: true,
    repeatCount: 2,
    giftId: 42,
  });
  expect(emit).toHaveBeenCalledWith(
    expect.objectContaining({ count: 2, giftId: "42", source: "tiktok" }),
  );
  a.disconnect();
  expect(a.status.state).toBe("disconnected");
});
it("retries failures and cancels pending retry on disconnect", async () => {
  vi.useFakeTimers();
  mock.fail = true;
  const a = new TikTokAdapter(vi.fn());
  await a.connect("offline");
  expect(a.status.state).toBe("reconnecting");
  a.disconnect();
  await vi.advanceTimersByTimeAsync(60000);
  expect(mock.instances.length).toBe(1);
});
it('can schedule retries again after manually disconnecting a failed connection',async()=>{vi.useFakeTimers();mock.fail=true;const a=new TikTokAdapter(vi.fn());await a.connect('first');a.disconnect();await a.connect('second');expect(a.status.state).toBe('reconnecting');await vi.advanceTimersByTimeAsync(2000);expect(mock.instances.length).toBe(3);a.disconnect();});
it("reports the missing signing-key setup before attempting a connection", async () => {
  delete process.env.TIKTOK_SIGN_API_KEY;
  const a = new TikTokAdapter(vi.fn());
  await a.connect("liveuser");
  expect(a.status).toMatchObject({ state: "error", username: "liveuser" });
  expect(a.status.error).toContain("TIKTOK_SIGN_API_KEY");
  expect(mock.instances).toHaveLength(0);
});
