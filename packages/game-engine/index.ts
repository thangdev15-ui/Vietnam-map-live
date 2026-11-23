import { randomUUID } from "node:crypto";
import {
  defaults,
  norm,
  type Settings,
  type Province,
  type State,
  type LiveEvent,
  type Player,
} from "../shared/index";
export class GameEngine {
  state: State;
  constructor(
    public provinces: Province[],
    settings: Settings = structuredClone(defaults),
  ) {
    this.state = {
      matchId: randomUUID(),
      phase: "waiting",
      endsAt: 0,
      winner: null,
      settings,
      territories: provinces.map((p) => ({
        id: p.id,
        owner: null,
        hp: settings.hp,
      })),
      players: [],
      feed: [],
      effects: [],
      processed: 0,
    };
  }
  start(now = Date.now()) {
    const blocked = this.state.players.filter((p) => p.blocked);
    this.state = new GameEngine(this.provinces, this.state.settings).state;
    this.state.players = blocked.map((p) => ({
      ...p,
      score: 0,
      target: null,
      team: null,
      history: [],
      combo: 0,
    }));
    this.state.phase = "running";
    this.state.endsAt = now + this.state.settings.duration * 1000;
  }
  log(s: string) {
    this.state.feed.unshift(s);
    this.state.feed.length = Math.min(60, this.state.feed.length);
  }
  tick(now = Date.now()) {
    if (this.state.phase !== "running") return;
    for (const t of this.state.territories)
      if (t.owner)
        t.hp = Math.min(
          this.state.settings.hp,
          t.hp + this.state.settings.regen,
        );
    if (now >= this.state.endsAt) this.finish();
  }
  finish() {
    const ranks = this.state.settings.teams
      .map((t) => ({
        id: t.id,
        n: this.state.territories.filter((p) => p.owner === t.id).length,
      }))
      .sort((a, b) => b.n - a.n);
    this.state.winner = ranks[0].n > ranks[1].n ? ranks[0].id : null;
    this.state.phase = "ended";
    this.log("Trận đấu kết thúc");
  }
  player(e: LiveEvent): Player {
    let p = this.state.players.find((p) => p.id === e.userId);
    if (!p) {
      if (this.state.players.length >= 10000)
        throw Error("Đã đạt giới hạn người chơi");
      p = {
        id: e.userId,
        name: e.username,
        team: null,
        score: 0,
        target: null,
        blocked: false,
        history: [],
        combo: 0,
        avatar: e.avatar,
      };
      this.state.players.push(p);
    }
    if (e.avatar) p.avatar = e.avatar;
    return p;
  }
  apply(e: LiveEvent) {
    if (this.state.phase === "running" && Date.now() >= this.state.endsAt)
      this.finish();
    if (this.state.phase !== "running") return "Trận chưa chạy";
    const p = this.player(e);
    if (p.blocked) return "Đã khóa";
    const s = this.state.settings;
    if (!s.enabled[e.type]) return "Loại sự kiện đã tắt";
    this.state.processed++;
    const text = norm(e.text ?? "");
    // Broadcast "Thắp sáng": khán giả chỉ cần bình luận đúng tên tỉnh/thành.
    // Owner "gold" chỉ giữ tương thích với dữ liệu lãnh thổ cũ, không hiển thị phe.
    if (e.type === "comment") {
      const cityText = text.replace(/^(thap sang|thap den|bat den)\s+/, "");
      const province = this.provinces.find((t) => {
        const name = norm(t.name);
        const id = norm(t.id);
        return cityText === name || cityText === id;
      });
      if (province) {
        p.target = province.id;
        p.team ??= "gold";
        // A city accumulates light from every viewer. Four standard comments
        // (25 light each) complete its lantern, rather than one comment winning it.
        return this.act(p, "attack", s.attack, e.id, "light");
      }
    }
    if (e.type === "comment") {
      const team = s.teams.find((t) => norm(t.keyword) === text);
      if (team) {
        if (p.team && p.team !== team.id) return "Không đổi phe giữa trận";
        p.team = team.id;
        this.log(`${p.name} gia nhập ${team.name}`);
        return "Đã tham gia";
      }
    }
    if (!p.team) return "Hãy chọn phe trước";
    if (e.type === "comment") {
      for (const [word, skill] of [
        [s.attackWord, "attack"],
        [s.defenseWord, "heal"],
      ] as const) {
        if (text.startsWith(norm(word) + " ")) {
          const name = text.slice(norm(word).length + 1);
          const province = this.provinces.find((t) => {
            const provinceName = norm(t.name);
            const provinceId = norm(t.id);
            return (
              name === provinceName ||
              name === provinceId ||
              name.startsWith(provinceName + " ") ||
              name.startsWith(provinceId + " ")
            );
          });
          if (!province) return "Không tìm thấy tỉnh";
          p.target = province.id;
          return this.act(
            p,
            skill,
            skill === "attack" ? s.attack : s.defense,
            e.id,
          );
        }
      }
      return "Không có lệnh phù hợp";
    }
    if (e.type === "gift") {
      const gift = s.gifts.find(
        (g) =>
          g.enabled &&
          (g.id === e.giftId || norm(g.name) === norm(e.giftName ?? "")),
      );
      if (!gift) return "Quà chưa được ánh xạ";
      return this.act(
        p,
        gift.skill,
        Math.min(100000, gift.power * e.count),
        e.id,
      );
    }
    return this.act(
      p,
      "boost",
      e.type === "like" ? Math.min(e.count, 10) : 10,
      e.id,
    );
  }
  act(
    p: Player,
    skill: "attack" | "heal" | "boost",
    power: number,
    id: string,
    visualKind?: string,
  ) {
    const s = this.state.settings;
    let t = this.state.territories.find((t) => t.id === p.target);
    if (skill === "boost") {
      t = this.state.territories.find((t) => t.owner === p.team && t.hp < s.hp);
      if (!t) return "Chưa có tỉnh cần hồi phục";
      skill = "heal";
    }
    if (!t) return "Chọn mục tiêu bằng bình luận trước";
    if (skill === "heal" && t.owner !== p.team)
      return "Chỉ phòng thủ tỉnh cùng phe";
    if (skill === "attack" && t.owner === p.team) return "Tỉnh đã thuộc phe";
    let kind: string = visualKind ?? skill;
    if (skill === "heal") {
      power = Math.min(power, s.hp - t.hp);
      t.hp += power;
    } else {
      t.hp -= power;
      if (t.owner) {
        const home = this.state.territories.find((x) => x.owner === p.team);
        if (home) home.hp = Math.max(1, home.hp - power * s.counter);
      }
      if (t.hp <= 0) {
        t.owner = p.team;
        t.hp = s.hp;
        kind = "capture";
        this.log(
          `${p.name} thắp sáng ${this.provinces.find((x) => x.id === t!.id)?.name}`,
        );
      }
    }
    p.score += power;
    p.combo++;
    p.history.unshift(`${skill} ${t.id} +${power}`);
    p.history.length = Math.min(30, p.history.length);
    this.state.effects.push({
      id,
      province: t.id,
      team: p.team!,
      kind,
      power,
      player: p.name,
      avatar: p.avatar,
    });
    this.state.effects = this.state.effects.slice(-30);
    if (
      (this.state.territories.filter((t) => t.owner === p.team).length /
        this.state.territories.length) *
        100 >=
      s.winPercent
    )
      this.finish();
    return kind;
  }
}
