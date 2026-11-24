import type { Dispatch, SetStateAction, ReactNode } from "react";
import type {
  Settings,
  State,
  Player,
  LiveEvent,
} from "../../../../packages/shared/index";
export type Status = {
  tiktok: { state: string; error: string; username: string };
  players: Player[];
  logs: {
    id: string;
    username: string;
    type: string;
    result: string;
    details: string;
  }[];
  queue: number;
  matches: { id: string; at: number; state: string }[];
};
type Setter<T> = Dispatch<SetStateAction<T>>;
export type AdminPanelProps = {
  state: State;
  status: Status | undefined;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  token: string;
  username: string;
  setUsername: Setter<string>;
  settings: Settings;
  setSettings: Setter<Settings>;
  numeric: (key: keyof Settings, label: string) => ReactNode;
  search: string;
  setSearch: Setter<string>;
  viewer: string;
  setViewer: Setter<string>;
  message: string;
  setMessage: Setter<string>;
  gift: string;
  setGift: Setter<string>;
  count: number;
  setCount: Setter<number>;
  send: (type: LiveEvent["type"]) => Promise<void>;
  burst: () => Promise<void>;
  superLight: (province: string) => Promise<void>;
  startMatch: () => Promise<void>;
  endMatch: () => Promise<void>;
  chooseMap: (map: Settings["map"]) => Promise<void>;
  closeVote: () => Promise<void>;
  pauseMatch: () => Promise<void>;
  resumeMatch: () => Promise<void>;
  busy: string;
  demoWave: number;
  demoTotal: number;
};
