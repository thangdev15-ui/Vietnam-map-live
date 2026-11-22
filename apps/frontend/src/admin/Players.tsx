import type { AdminPanelProps } from "./types";
import { api } from "../api";
export function Players({
  search,
  setSearch,
  status,
  run,
  token,
}: Pick<AdminPanelProps, "search" | "setSearch" | "status" | "run" | "token">) {
  return (
    <section>
      <input
        aria-label="Tìm người chơi"
        placeholder="Tìm người chơi…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {status?.players
        .filter((p) => p.name.includes(search))
        .map((p) => (
          <details key={p.id}>
            <summary>
              {p.name} · {p.team ?? "chưa chọn phe"} · {p.score} điểm
            </summary>
            <button
              onClick={() =>
                run(() =>
                  api("block", token, { id: p.id, blocked: !p.blocked }),
                )
              }
            >
              {p.blocked ? "Bỏ khóa" : "Khóa người chơi"}
            </button>
            <p>{p.history.join(" / ") || "Chưa có hoạt động chiến đấu"}</p>
          </details>
        ))}
    </section>
  );
}
