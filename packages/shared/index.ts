import { z } from "zod";
export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export const teamSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  keyword: z.string().min(1).max(40),
});
export const settingsSchema = z
  .object({
    teams: z.array(teamSchema).min(2).max(6),
    duration: z.number().int().min(30).max(86400),
    hp: z.number().int().min(10).max(100000),
    attack: z.number().min(1).max(10000),
    defense: z.number().min(1).max(10000),
    counter: z.number().min(0).max(1),
    regen: z.number().min(0).max(100),
    cooldown: z.number().min(0).max(60000),
    spamLimit: z.number().int().min(1).max(100),
    winPercent: z.number().min(1).max(100),
    attackWord: z.string().min(1).max(30),
    defenseWord: z.string().min(1).max(30),
    enabled: z.object({
      comment: z.boolean(),
      gift: z.boolean(),
      like: z.boolean(),
      follow: z.boolean(),
      share: z.boolean(),
    }),
    gifts: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          name: z.string().max(80),
          skill: z.enum(["attack", "heal", "boost"]),
          power: z.number().min(1).max(10000),
          enabled: z.boolean(),
        }),
      )
      .max(200),
    map: z.enum(["historical63", "merged34"]),
  })
  .superRefine((s, c) => {
    if (
      new Set(s.teams.map((t) => t.id)).size !== s.teams.length ||
      new Set(s.teams.map((t) => norm(t.keyword))).size !== s.teams.length
    )
      c.addIssue({ code: "custom", message: "Phe và từ khóa phải duy nhất" });
  });
export type Settings = z.infer<typeof settingsSchema>;
export const defaults: Settings = {
  teams: [
    { id: "red", name: "Hồng kỳ", color: "#ff5368", keyword: "đỏ" },
    { id: "blue", name: "Lam quân", color: "#4aa8ff", keyword: "xanh" },
    { id: "gold", name: "Kim long", color: "#ffc857", keyword: "vàng" },
  ],
  duration: 900,
  hp: 100,
  attack: 25,
  defense: 20,
  counter: 0.15,
  regen: 1,
  cooldown: 1200,
  spamLimit: 30,
  winPercent: 70,
  attackWord: "đánh",
  defenseWord: "thủ",
  enabled: { comment: true, gift: true, like: true, follow: true, share: true },
  gifts: [
    { id: "rose", name: "Rose", skill: "attack", power: 40, enabled: true },
  ],
  map: "historical63",
};
export const eventSchema = z.object({
  id: z.string().min(1).max(200),
  source: z.enum(["demo", "tiktok"]),
  type: z.enum(["comment", "gift", "like", "follow", "share"]),
  userId: z.string().min(1).max(100),
  username: z.string().min(1).max(100),
  avatar: z.string().url().max(1000).optional(),
  text: z.string().max(300).optional(),
  giftId: z.string().max(80).optional(),
  giftName: z.string().max(80).optional(),
  count: z.number().int().min(1).max(10000).default(1),
});
export type LiveEvent = z.infer<typeof eventSchema>;
export type Province = {
  id: string;
  name: string;
  center: [number, number];
  polygons: number[][][][];
};
export type Territory = { id: string; owner: string | null; hp: number };
export type Player = {
  id: string;
  name: string;
  team: string | null;
  score: number;
  target: string | null;
  blocked: boolean;
  history: string[];
  combo: number;
  avatar?: string;
};
export type Effect = {
  id: string;
  province: string;
  team: string;
  kind: string;
  power: number;
  player: string;
  avatar?: string;
};
export type State = {
  matchId: string;
  phase: "waiting" | "running" | "ended";
  endsAt: number;
  winner: string | null;
  settings: Settings;
  territories: Territory[];
  players: Player[];
  feed: string[];
  effects: Effect[];
  processed: number;
};
