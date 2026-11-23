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
  it("lights a city from its name without requiring a team command", () => {
    const g = game();
    expect(g.apply(event("Hà Nội"))).toBe("capture");
    expect(g.state.territories[0]).toMatchObject({ owner: "gold", hp: 100 });
    expect(g.state.players[0]).toMatchObject({ team: "gold", target: "ha-noi", score: 100 });
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
