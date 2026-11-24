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
// Each ID points to a separate geographic dataset; it is not a visual skin.
export const mapSchema = z.enum(["vietnam", "southeast-asia", "world"]);
export const mapCatalog = {
  vietnam: { id: "vietnam", name: "VIỆT NAM", keyword: "1", description: "63 tỉnh, thành Việt Nam" },
  "southeast-asia": { id: "southeast-asia", name: "ĐÔNG NAM Á", keyword: "2", description: "11 quốc gia Đông Nam Á" },
  world: { id: "world", name: "THẾ GIỚI", keyword: "3", description: "242 quốc gia và vùng lãnh thổ" },
} as const;
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
          skill: z.enum(["attack", "heal", "boost", "super"]),
          power: z.number().min(1).max(10000),
          enabled: z.boolean(),
        }),
      )
      .max(200),
    map: mapSchema,
    vietnamVariant: z.enum(["historical63", "merged34"]).default("historical63"),
    activeMaps: z.array(mapSchema).min(1).max(3).default(["vietnam", "southeast-asia", "world"]),
    votingDuration: z.number().int().min(10).max(120).default(30),
    comboWindow: z.number().int().min(2).max(60).default(10),
    comboThreshold: z.number().int().min(2).max(20).default(3),
    comboBonus: z.number().int().min(0).max(100000).default(10),
    lightSpread: z.boolean().default(true),
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
  map: "vietnam",
  vietnamVariant: "historical63",
  activeMaps: ["vietnam", "southeast-asia", "world"],
  votingDuration: 30,
  comboWindow: 10,
  comboThreshold: 3,
  comboBonus: 10,
  lightSpread: true,
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
export type Territory = {
  id: string;
  owner: string | null;
  hp: number;
  contributors?: { id: string; name: string; avatar?: string }[];
};
export type Player = {
  id: string;
  name: string;
  team: string | null;
  score: number;
  target: string | null;
  blocked: boolean;
  history: string[];
  combo: number;
  comboAt?: number;
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
export type VoteCandidate = { id: z.infer<typeof mapSchema>; name: string; keyword: string; description: string; votes: number };
export type Voting = {
  endsAt: number;
  resultEndsAt?: number;
  candidates: VoteCandidate[];
  voterIds: string[];
  winner?: z.infer<typeof mapSchema>;
};
export type State = {
  matchId: string;
  phase: "waiting" | "voting" | "vote_result" | "voting_tie" | "vote_empty" | "running" | "paused" | "ended";
  endsAt: number;
  pausedRemaining?: number;
  winner: string | null;
  settings: Settings;
  territories: Territory[];
  players: Player[];
  feed: string[];
  effects: Effect[];
  processed: number;
  chestsUnlocked?: number[];
  voting?: Voting;
};
