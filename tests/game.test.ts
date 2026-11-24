import { describe, it, expect } from "vitest";
import { GameEngine } from "../packages/game-engine/index";
import {
  defaults,
  type LiveEvent,
  type Province,
} from "../packages/shared/index";
const map: Province[] = [
  { id: "ha-noi", name: "Hà Nội", center: [105, 21], polygons: [] },
  { id: "can-tho", name: "Cần Thơ", center: [105, 10], polygons: [] },
];
const event = (text: string, id = crypto.randomUUID()): LiveEvent => ({
  id,
  source: "demo",
  type: "comment",
  userId: "u",
  username: "User",
  text,
  count: 1,
});
function game() {
  const g = new GameEngine(map, structuredClone(defaults));
  g.start();
  return g;
}
describe("Game rules", () => {
  it("joins using normalized Vietnamese and prevents team hopping", () => {
    const g = game();
    g.apply(event("ĐỎ"));
    expect(g.state.players[0].team).toBe("red");
    g.apply(event("xanh"));
    expect(g.state.players[0].team).toBe("red");
  });
  it("accumulates viewer light before a city is fully lit", () => {
    const g = game();
    expect(g.apply(event("Hà Nội"))).toBe("light");
    expect(g.state.territories[0]).toMatchObject({ owner: null, hp: 75 });
    for (let i = 0; i < 2; i++) expect(g.apply(event("Hà Nội"))).toBe("light");
    expect(g.apply(event("Hà Nội"))).toBe("capture");
    expect(g.state.territories[0]).toMatchObject({ owner: "gold", hp: 100 });
    expect(g.state.players[0]).toMatchObject({ team: "gold", target: "ha-noi", score: 110 });
  });
  it("keeps a lit city open and shows later contributors", () => {
    const g = game();
    for (let i = 0; i < 4; i++) g.apply(event("Hà Nội"));
    const visitor = { ...event("Hà Nội"), userId: "visitor", username: "Người cùng thắp" };
    expect(g.apply(visitor)).toBe("gather");
    expect(g.state.territories[0].contributors).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Người cùng thắp" })]),
    );
  });
  it("runs a super-light gift as a real gameplay effect", () => {
    const settings = structuredClone(defaults);
    settings.gifts = [{ id: "super", name: "Super", skill: "super", power: 100, enabled: true }];
    const g = new GameEngine(map, settings);
    g.start();
    g.apply(event("hà nội"));
    expect(g.apply({ ...event(""), type: "gift", giftId: "super" })).toBe("super");
    expect(g.state.territories[0].owner).toBe("gold");
    expect(g.state.effects.some((effect) => effect.kind === "super")).toBe(true);
  });
  it("awards combo bonuses at the configured threshold and expires them", () => {
    const settings = structuredClone(defaults);
    settings.comboThreshold = 3;
    settings.comboBonus = 12;
    settings.comboWindow = 2;
    const g = new GameEngine(map, settings);
    g.start();
    for (let i = 0; i < 3; i++) g.apply({ ...event("hà nội"), id: `combo-${i}` });
    expect(g.state.players[0].combo).toBe(3);
    expect(g.state.players[0].score).toBe(87);
    expect(g.state.effects.some((effect) => effect.kind === "combo" && effect.power === 12)).toBe(true);
    g.state.players[0].comboAt = Date.now() - 2_001;
    g.tick();
    expect(g.state.players[0].combo).toBe(0);
  });
  it("uses light spread only as a visual event and never claims nearby provinces", () => {
    const g = game();
    for (let i = 0; i < 4; i++) g.apply({ ...event("hà nội"), id: `light-${i}` });
    expect(g.state.effects.filter((effect) => effect.kind === "spread")).toHaveLength(1);
    expect(g.state.territories[1].owner).toBeNull();
  });
  it("emits a completion event only when every province is lit", () => {
    const settings = structuredClone(defaults);
    settings.winPercent = 100;
    settings.lightSpread = false;
    const g = new GameEngine(map, settings);
    g.start();
    for (const city of ["hà nội", "cần thơ"])
      for (let i = 0; i < 4; i++) g.apply({ ...event(city), id: `${city}-${i}` });
    expect(g.state.territories.every((territory) => territory.owner)).toBe(true);
    expect(g.state.effects.some((effect) => effect.kind === "complete")).toBe(true);
    expect(g.state.phase).toBe("ended");
  });
  it("captures province only after defense exhausted", () => {
    const g = game();
    g.apply(event("đỏ"));
    for (let i = 0; i < 3; i++) g.apply(event("đánh hà nội"));
    expect(g.state.territories[0].owner).toBeNull();
    g.apply(event("danh ha noi"));
    expect(g.state.territories[0]).toMatchObject({ owner: "red", hp: 100 });
  });
  it("accepts a province command followed by an explanatory word", () => {
    const g = game();
    g.apply(event("đỏ"));
    expect(g.apply(event("đánh hà nội đi"))).toBe("attack");
    expect(g.state.territories[0].hp).toBe(75);
  });
  it("defends owned territory and caps health", () => {
    const g = game();
    g.apply(event("đỏ"));
    g.state.territories[0] = { id: "ha-noi", owner: "red", hp: 90 };
    g.apply(event("thủ hà nội"));
    expect(g.state.territories[0].hp).toBe(100);
    g.apply(event("thủ cần thơ"));
    expect(g.state.territories[1].hp).toBe(100);
  });
  it("maps gifts and ignores unknown gifts", () => {
    const g = game();
    g.apply(event("đỏ"));
    g.apply(event("đánh hà nội"));
    g.apply({ ...event(""), type: "gift", giftId: "rose", count: 2 });
    expect(g.state.territories[0].owner).toBe("red");
    const score = g.state.players[0].score;
    g.apply({ ...event(""), type: "gift", giftId: "unknown" });
    expect(g.state.players[0].score).toBe(score);
  });
  it("blocks players and disabled events", () => {
    const g = game();
    g.apply(event("đỏ"));
    g.state.players[0].blocked = true;
    g.apply(event("đánh hà nội"));
    expect(g.state.territories[0].hp).toBe(100);
    g.state.players[0].blocked = false;
    g.state.settings.enabled.comment = false;
    g.apply(event("đánh hà nội"));
    expect(g.state.territories[0].hp).toBe(100);
  });
  it("counterattacks and passive regeneration", () => {
    const g = game();
    g.apply(event("đỏ"));
    g.state.territories[0] = { id: "ha-noi", owner: "blue", hp: 100 };
    g.state.territories[1] = { id: "can-tho", owner: "red", hp: 50 };
    g.apply(event("đánh hà nội"));
    expect(g.state.territories[1].hp).toBe(46.25);
    g.tick();
    expect(g.state.territories[1].hp).toBe(47.25);
  });
  it("ends on clock and resolves tie explicitly", () => {
    const g = game();
    g.tick(g.state.endsAt + 1);
    expect(g.state.phase).toBe("ended");
    expect(g.state.winner).toBeNull();
    expect(g.apply(event("đỏ"))).toBe("Trận chưa chạy");
  });
  it("opens a map vote, accepts one valid vote per viewer and resolves a winner", () => {
    const g = new GameEngine(map, structuredClone(defaults));
    expect(g.beginVoting(0)).toBe("voting");
    expect(g.apply({ ...event("1"), userId: "viewer-a" })).toBe("vote");
    expect(g.apply({ ...event("2"), userId: "viewer-a" })).toBe("Đã bình chọn");
    expect(g.apply({ ...event("không hợp lệ"), userId: "viewer-b" })).toBe("Bình luận không phải lựa chọn bản đồ");
    expect(g.apply({ ...event("việt nam"), userId: "viewer-b" })).toBe("vote");
    g.tick(30_000);
    expect(g.state.phase).toBe("vote_result");
    expect(g.state.voting?.winner).toBe("vietnam");
    expect(g.tick(32_500)).toBe("vietnam");
  });
  it("does not randomly resolve a tied or empty map vote", () => {
    const tied = new GameEngine(map, structuredClone(defaults));
    tied.beginVoting(0);
    tied.apply({ ...event("1"), userId: "viewer-a" });
    tied.apply({ ...event("2"), userId: "viewer-b" });
    tied.tick(30_000);
    expect(tied.state.phase).toBe("voting_tie");
    expect(tied.chooseMap("southeast-asia", 30_000)).toBe("vote_result");

    const empty = new GameEngine(map, structuredClone(defaults));
    empty.beginVoting(0);
    empty.tick(30_000);
    expect(empty.state.phase).toBe("vote_empty");
  });
  it("pauses the authoritative clock and resumes with remaining time", () => {
    const g = game();
    const endsAt = g.state.endsAt;
    expect(g.pause(endsAt - 10_000)).toBe("paused");
    expect(g.state.pausedRemaining).toBe(10_000);
    expect(g.resume(500_000)).toBe("running");
    expect(g.state.endsAt).toBe(510_000);
  });
  it("ends at territory threshold and retains bans on reset", () => {
    const g = game();
    g.state.settings.winPercent = 50;
    g.apply(event("đỏ"));
    g.apply(event("đánh hà nội"));
    g.apply({ ...event(""), type: "gift", giftId: "rose", count: 3 });
    expect(g.state.winner).toBe("red");
    g.state.players[0].blocked = true;
    g.start();
    expect(g.state.players[0].blocked).toBe(true);
    expect(g.state.territories.every((t) => t.owner === null)).toBe(true);
  });
});
