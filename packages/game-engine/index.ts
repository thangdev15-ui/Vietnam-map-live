import { randomUUID } from "node:crypto";
import {
  defaults,
  mapCatalog,
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
        contributors: [],
      })),
      players: [],
      feed: [],
      effects: [],
      processed: 0,
      chestsUnlocked: [],
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
      comboAt: undefined,
    }));
    this.state.phase = "running";
    this.state.endsAt = now + this.state.settings.duration * 1000;
  }
  beginVoting(now = Date.now()) {
    if (!["waiting", "ended"].includes(this.state.phase))
      return this.state.phase === "running" || this.state.phase === "paused"
        ? "Hãy kết thúc trận đang chạy trước"
        : "Vòng bình chọn đang diễn ra";
    const blocked = this.state.players.filter((p) => p.blocked);
    const candidates = this.state.settings.activeMaps.map((id) => ({ ...mapCatalog[id], votes: 0 }));
    this.state = new GameEngine(this.provinces, this.state.settings).state;
    this.state.players = blocked.map((p) => ({
      ...p,
      score: 0,
      target: null,
      team: null,
      history: [],
      combo: 0,
      comboAt: undefined,
    }));
    this.state.phase = "voting";
    this.state.voting = {
      endsAt: now + this.state.settings.votingDuration * 1000,
      candidates,
      voterIds: [],
    };
    this.log("Bình chọn bản đồ đã mở");
    return "voting";
  }
  chooseMap(id: Settings["map"], now = Date.now()) {
    if (!this.state.settings.activeMaps.includes(id)) return "Bản đồ chưa được kích hoạt";
    if (!["voting_tie", "vote_empty", "vote_result", "voting"].includes(this.state.phase))
      return "Không có vòng bình chọn cần chọn";
    const candidates = this.state.voting?.candidates ?? [];
    const winner = candidates.find((candidate) => candidate.id === id);
    if (!winner) return "Bản đồ không có trong vòng bình chọn";
    this.state.phase = "vote_result";
    this.state.voting = { ...this.state.voting!, winner: id, resultEndsAt: now + 2500 };
    this.log(`${winner.name} được chọn làm chiến trường`);
    return "vote_result";
  }
  finishVoting(now = Date.now()) {
    if (this.state.phase !== "voting" || !this.state.voting)
      return "Không có vòng bình chọn đang mở";
    const ranked = [...this.state.voting.candidates].sort((a, b) => b.votes - a.votes);
    if (!ranked[0] || ranked[0].votes === 0) {
      this.state.phase = "vote_empty";
      this.log("Bình chọn chưa có phiếu — quản trị viên hãy chọn bản đồ");
      return "vote_empty";
    }
    if (ranked[1]?.votes === ranked[0].votes) {
      this.state.phase = "voting_tie";
      this.log("Bình chọn hòa — quản trị viên hãy chọn bản đồ");
      return "voting_tie";
    }
    return this.chooseMap(ranked[0].id, now);
  }
  log(s: string) {
    this.state.feed.unshift(s);
    this.state.feed.length = Math.min(60, this.state.feed.length);
  }
  tick(now = Date.now()) {
    if (this.state.phase === "voting" && this.state.voting && now >= this.state.voting.endsAt) {
      this.finishVoting(now);
      return;
    }
    if (this.state.phase === "vote_result" && this.state.voting?.winner && this.state.voting.resultEndsAt && now >= this.state.voting.resultEndsAt)
      return this.state.voting.winner;
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
  pause(now = Date.now()) {
    if (this.state.phase !== "running") return "Không có trận đang chạy";
    this.state.pausedRemaining = Math.max(0, this.state.endsAt - now);
    this.state.phase = "paused";
    this.log("Trận đấu đã tạm dừng");
    return "paused";
  }
  resume(now = Date.now()) {
    if (this.state.phase !== "paused") return "Trận không ở trạng thái tạm dừng";
    this.state.endsAt = now + (this.state.pausedRemaining ?? 0);
    this.state.pausedRemaining = undefined;
    this.state.phase = "running";
    this.log("Trận đấu tiếp tục");
    return "running";
  }
  triggerSuperLight(provinceId: string, power = this.state.settings.attack * 3, playerName = "COMMAND CENTER") {
    if (this.state.phase !== "running") return "Trận chưa chạy";
    const province = this.provinces.find((item) => item.id === provinceId);
    if (!province) return "Không tìm thấy tỉnh";
    const event: LiveEvent = {
      id: randomUUID(), source: "demo", type: "gift", userId: `system:${playerName}`,
      username: playerName, text: "", count: 1,
    };
    const player = this.player(event);
    player.team ??= "gold";
    player.target = provinceId;
    const territory = this.state.territories.find((item) => item.id === provinceId)!;
    this.rememberContributor(territory, player);
    return this.superLight(player, Math.min(100000, power), event.id);
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
    if (this.state.phase === "voting") return this.vote(e);
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
        const territory = this.state.territories.find((t) => t.id === province.id)!;
        this.rememberContributor(territory, p);
        if (territory.owner === p.team)
          return this.gatherLight(p, territory, e.id);
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
      if (gift.skill === "super")
        return this.superLight(p, Math.min(100000, gift.power * e.count), e.id);
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
  private vote(e: LiveEvent) {
    if (e.type !== "comment" || !this.state.voting) return "Đang bình chọn bản đồ";
    const text = norm(e.text ?? "");
    const candidate = this.state.voting.candidates.find((item) =>
      [item.keyword, item.id, item.name].some((key) => norm(key) === text),
    );
    if (!candidate) return "Bình luận không phải lựa chọn bản đồ";
    if (this.state.voting.voterIds.includes(e.userId)) return "Đã bình chọn";
    this.state.voting.voterIds.push(e.userId);
    candidate.votes++;
    this.state.processed++;
    this.log(`${e.username} bình chọn ${candidate.name}`);
    return "vote";
  }
  private rememberContributor(
    territory: State["territories"][number],
    player: Player,
  ) {
    const contributor = { id: player.id, name: player.name, avatar: player.avatar };
    territory.contributors = [
      contributor,
      ...(territory.contributors ?? []).filter((entry) => entry.id !== player.id),
    ].slice(0, 8);
  }
  private gatherLight(
    player: Player,
    territory: State["territories"][number],
    id: string,
  ) {
    const power = Math.max(1, Math.round(this.state.settings.attack / 5));
    player.score += power;
    this.bumpCombo(player);
    player.history.unshift(`cùng thắp ${territory.id} +${power}`);
    player.history.length = Math.min(30, player.history.length);
    this.log(
      `${player.name} cùng thắp ${this.provinces.find((province) => province.id === territory.id)?.name}`,
    );
    this.state.effects.push({
      id,
      province: territory.id,
      team: player.team!,
      kind: "gather",
      power,
      player: player.name,
      avatar: player.avatar,
    });
    this.state.effects = this.state.effects.slice(-30);
    return "gather";
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
    let captured = false;
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
        captured = true;
        this.log(
          `${p.name} thắp sáng ${this.provinces.find((x) => x.id === t!.id)?.name}`,
        );
      }
    }
    p.score += power;
    this.bumpCombo(p);
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
    if (captured) this.unlockChest(t.id, p.name);
    if (
      (this.state.territories.filter((t) => t.owner === p.team).length /
        this.state.territories.length) *
        100 >=
      s.winPercent
    )
      this.finish();
    return kind;
  }
  private bumpCombo(player: Player, now = Date.now()) {
    player.combo = !player.comboAt || now - player.comboAt > 10_000 ? 1 : player.combo + 1;
    player.comboAt = now;
  }
  private unlockChest(provinceId: string, player: string) {
    const lit = this.state.territories.filter((territory) => territory.owner).length;
    const milestone = [5, 10, 20, Math.ceil(this.state.territories.length / 2), this.state.territories.length]
      .find((value) => value === lit && !(this.state.chestsUnlocked ?? []).includes(value));
    if (!milestone) return;
    this.state.chestsUnlocked = [...(this.state.chestsUnlocked ?? []), milestone];
    this.state.effects.push({ id: randomUUID(), province: provinceId, team: "gold", kind: "chest", power: milestone, player });
    this.state.effects = this.state.effects.slice(-30);
    this.log(`Rương ánh sáng mốc ${milestone} tỉnh đã mở`);
  }
  private superLight(player: Player, power: number, id: string) {
    const territory = this.state.territories.find((item) => item.id === player.target);
    if (!territory) return "Chọn mục tiêu bằng bình luận trước";
    territory.hp -= power;
    let captured = false;
    if (territory.hp <= 0) {
      territory.owner = player.team;
      territory.hp = this.state.settings.hp;
      captured = true;
    }
    player.score += power;
    this.bumpCombo(player);
    this.state.effects.push({ id, province: territory.id, team: player.team!, kind: "super", power, player: player.name, avatar: player.avatar });
    this.state.effects = this.state.effects.slice(-30);
    this.log(`${player.name} kích hoạt SIÊU THẮP SÁNG tại ${this.provinces.find((item) => item.id === territory.id)?.name}`);
    if (captured) this.unlockChest(territory.id, player.name);
    return "super";
  }
}
